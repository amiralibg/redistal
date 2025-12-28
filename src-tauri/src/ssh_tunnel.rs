use crate::redis_client::{SshAuthMethod, SshTunnelConfig};
use ssh2::Session;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

pub struct SshTunnel {
    local_port: u16,
    stop_signal: Arc<AtomicBool>,
}

const SSH_TIMEOUT_MS: u32 = 10_000; // Avoid indefinite blocking on SSH operations

// Helper function to expand ~ in paths
fn expand_path(path: &str) -> PathBuf {
    if path.starts_with("~/") {
        if let Some(home) = std::env::var_os("HOME") {
            let mut expanded = PathBuf::from(home);
            expanded.push(&path[2..]);
            return expanded;
        }
    }
    PathBuf::from(path)
}

impl SshTunnel {
    pub fn new(
        config: &SshTunnelConfig,
        remote_host: &str,
        remote_port: u16,
    ) -> Result<Self, String> {
        // 1. Connect to SSH server and authenticate (for validation)
        let session = create_ssh_session(config)?;

        // 2. Validate that the SSH server can reach the target host/port.
        {
            let mut channel = session
                .channel_direct_tcpip(remote_host, remote_port, None)
                .map_err(|e| {
                    format!(
                        "SSH tunnel probe failed to reach {}:{} from the SSH server: {}",
                        remote_host, remote_port, e
                    )
                })?;

            // Cleanly close the probe channel.
            let _ = channel.close();
            let _ = channel.wait_close();
        }

        // Close the validation session - we'll create new ones per connection
        drop(session);

        // 3. Find available local port or use specified
        let local_port = config
            .local_port
            .unwrap_or_else(|| find_available_port().unwrap_or(9000));

        // 4. Verify the local port is actually bindable
        let listener = TcpListener::bind(format!("127.0.0.1:{}", local_port))
            .map_err(|e| format!("Failed to bind local tunnel port {}: {}", local_port, e))?;

        // 5. Start port forwarding in background thread
        let stop_signal = Arc::new(AtomicBool::new(false));

        start_forwarding(
            config.clone(),
            listener,
            local_port,
            remote_host.to_string(),
            remote_port,
            Arc::clone(&stop_signal),
        );

        Ok(Self {
            local_port,
            stop_signal,
        })
    }

    pub fn local_port(&self) -> u16 {
        self.local_port
    }
}

impl Drop for SshTunnel {
    fn drop(&mut self) {
        self.stop_signal.store(true, Ordering::SeqCst);
    }
}

/// Create a new SSH session with authentication
fn create_ssh_session(config: &SshTunnelConfig) -> Result<Session, String> {
    let tcp = TcpStream::connect(format!("{}:{}", config.ssh_host, config.ssh_port))
        .map_err(|e| format!("SSH connection failed: {}", e))?;

    let mut session =
        Session::new().map_err(|e| format!("SSH session creation failed: {}", e))?;
    session.set_timeout(SSH_TIMEOUT_MS);
    session.set_tcp_stream(tcp);
    session
        .handshake()
        .map_err(|e| format!("SSH handshake failed: {}", e))?;

    // Authenticate
    match config.auth_method {
        SshAuthMethod::Password => {
            let password = config
                .ssh_password
                .as_ref()
                .ok_or("SSH password required")?;
            session
                .userauth_password(&config.ssh_username, password)
                .map_err(|e| format!("SSH authentication failed: {}", e))?;
        }
        SshAuthMethod::PrivateKey => {
            let key_path = config
                .ssh_private_key_path
                .as_ref()
                .ok_or("SSH private key path required")?;

            let expanded_path = expand_path(key_path);

            if !expanded_path.exists() {
                return Err(format!(
                    "SSH private key file not found: {}",
                    expanded_path.display()
                ));
            }

            session
                .userauth_pubkey_file(
                    &config.ssh_username,
                    None,
                    &expanded_path,
                    config.ssh_passphrase.as_deref(),
                )
                .map_err(|e| format!("SSH key authentication failed: {}", e))?;
        }
    }

    if !session.authenticated() {
        return Err("SSH authentication failed".to_string());
    }

    Ok(session)
}

fn find_available_port() -> Option<u16> {
    (9000..10000).find(|port| TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok())
}

fn start_forwarding(
    config: SshTunnelConfig,
    listener: TcpListener,
    _local_port: u16,
    remote_host: String,
    remote_port: u16,
    stop_signal: Arc<AtomicBool>,
) {
    listener
        .set_nonblocking(true)
        .expect("Failed to set listener non-blocking");

    thread::spawn(move || {
        loop {
            if stop_signal.load(Ordering::SeqCst) {
                break;
            }

            match listener.accept() {
                Ok((local_stream, _addr)) => {
                    let config = config.clone();
                    let remote_host = remote_host.clone();

                    thread::spawn(move || {
                        let _ = handle_connection(config, local_stream, &remote_host, remote_port);
                    });
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(_) => {
                    break;
                }
            }
        }
    });
}

/// Handle a single connection by creating a dedicated SSH session and channel
fn handle_connection(
    config: SshTunnelConfig,
    local_stream: TcpStream,
    remote_host: &str,
    remote_port: u16,
) -> Result<(), String> {
    // Create a new SSH session for this connection
    // This avoids mutex contention and blocking mode issues
    let session = create_ssh_session(&config)?;

    // Remove the timeout for data transfer - we only want it for initial connection
    session.set_timeout(0);

    // Create the channel for this connection
    let channel = session
        .channel_direct_tcpip(remote_host, remote_port, None)
        .map_err(|e| format!("Failed to create SSH channel: {}", e))?;

    // Set session to non-blocking mode for bidirectional I/O
    session.set_blocking(false);

    // Perform bidirectional copy
    copy_bidirectional(local_stream, channel, &session)?;

    Ok(())
}

/// Bidirectional copy between local stream and SSH channel
fn copy_bidirectional(
    mut stream: TcpStream,
    mut channel: ssh2::Channel,
    session: &Session,
) -> Result<(), String> {
    // Set stream to non-blocking
    stream
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to set stream non-blocking: {}", e))?;

    let mut stream_buf = vec![0u8; 32768];
    let mut channel_buf = vec![0u8; 32768];
    let mut idle_count = 0u32;

    loop {
        let mut progress = false;

        // Read from local stream, write to SSH channel
        match stream.read(&mut stream_buf) {
            Ok(0) => {
                // Client closed connection
                let _ = channel.send_eof();
                let _ = channel.close();
                let _ = channel.wait_close();
                return Ok(());
            }
            Ok(n) => {
                // Temporarily set blocking for reliable writes
                session.set_blocking(true);
                if let Err(e) = channel.write_all(&stream_buf[..n]) {
                    return Err(format!("Failed to write to channel: {}", e));
                }
                let _ = channel.flush();
                session.set_blocking(false);
                progress = true;
                idle_count = 0;
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
            Err(e) => {
                return Err(format!("Stream read error: {}", e));
            }
        }

        // Read from SSH channel, write to local stream
        match channel.read(&mut channel_buf) {
            Ok(0) => {
                if channel.eof() {
                    return Ok(());
                }
            }
            Ok(n) => {
                if let Err(e) = stream.write_all(&channel_buf[..n]) {
                    return Err(format!("Failed to write to stream: {}", e));
                }
                let _ = stream.flush();
                progress = true;
                idle_count = 0;
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
            Err(e) => {
                // Check for EAGAIN which ssh2 sometimes returns as a generic error
                let msg = e.to_string();
                if !msg.contains("EAGAIN") && !msg.contains("would block") {
                    return Err(format!("Channel read error: {}", e));
                }
            }
        }

        if channel.eof() {
            return Ok(());
        }

        if !progress {
            idle_count += 1;
            // Adaptive sleep: sleep longer when idle
            let sleep_ms = if idle_count > 100 { 10 } else { 1 };
            thread::sleep(std::time::Duration::from_millis(sleep_ms));
        }
    }
}
