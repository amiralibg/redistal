use crate::redis_client::{SshAuthMethod, SshTunnelConfig};
use ssh2::Session;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;

pub struct SshTunnel {
    _session: Arc<Mutex<Session>>,
    local_port: u16,
    _stop_signal: Arc<Mutex<bool>>,
}

impl SshTunnel {
    pub fn new(
        config: &SshTunnelConfig,
        remote_host: &str,
        remote_port: u16,
    ) -> Result<Self, String> {
        // 1. Connect to SSH server
        let tcp = TcpStream::connect(format!("{}:{}", config.ssh_host, config.ssh_port))
            .map_err(|e| format!("SSH connection failed: {}", e))?;

        let mut session =
            Session::new().map_err(|e| format!("SSH session creation failed: {}", e))?;
        session.set_tcp_stream(tcp);
        session
            .handshake()
            .map_err(|e| format!("SSH handshake failed: {}", e))?;

        // 2. Authenticate
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
                session
                    .userauth_pubkey_file(
                        &config.ssh_username,
                        None,
                        Path::new(key_path),
                        config.ssh_passphrase.as_deref(),
                    )
                    .map_err(|e| format!("SSH key authentication failed: {}", e))?;
            }
        }

        if !session.authenticated() {
            return Err("SSH authentication failed".to_string());
        }

        // 3. Find available local port or use specified
        let local_port = config
            .local_port
            .unwrap_or_else(|| find_available_port().unwrap_or(9000));

        // 4. Start port forwarding in background thread
        let session = Arc::new(Mutex::new(session));
        let stop_signal = Arc::new(Mutex::new(false));

        start_forwarding(
            Arc::clone(&session),
            local_port,
            remote_host.to_string(),
            remote_port,
            Arc::clone(&stop_signal),
        )?;

        Ok(Self {
            _session: session,
            local_port,
            _stop_signal: stop_signal,
        })
    }

    pub fn local_port(&self) -> u16 {
        self.local_port
    }
}

impl Drop for SshTunnel {
    fn drop(&mut self) {
        *self._stop_signal.lock().unwrap() = true;
    }
}

fn find_available_port() -> Option<u16> {
    (9000..10000).find(|port| TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok())
}

fn start_forwarding(
    session: Arc<Mutex<Session>>,
    local_port: u16,
    remote_host: String,
    remote_port: u16,
    stop_signal: Arc<Mutex<bool>>,
) -> Result<(), String> {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", local_port))
        .map_err(|e| format!("Failed to bind local port: {}", e))?;

    listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to set non-blocking: {}", e))?;

    thread::spawn(move || {
        loop {
            if *stop_signal.lock().unwrap() {
                break;
            }

            match listener.accept() {
                Ok((mut local_stream, _)) => {
                    let session = Arc::clone(&session);
                    let remote_host = remote_host.clone();

                    thread::spawn(move || {
                        let session = session.lock().unwrap();
                        match session.channel_direct_tcpip(&remote_host, remote_port, None) {
                            Ok(mut channel) => {
                                // Forward data bidirectionally
                                let local_clone = local_stream.try_clone().ok();

                                // Local -> Remote
                                let mut buf = [0u8; 8192];
                                loop {
                                    match local_stream.read(&mut buf) {
                                        Ok(0) => break, // EOF
                                        Ok(n) => {
                                            if channel.write_all(&buf[..n]).is_err() {
                                                break;
                                            }
                                        }
                                        Err(_) => break,
                                    }
                                }

                                // Remote -> Local (in separate thread if we had the clone)
                                if let Some(mut local_write) = local_clone {
                                    let mut buf = [0u8; 8192];
                                    loop {
                                        match channel.read(&mut buf) {
                                            Ok(0) => break,
                                            Ok(n) => {
                                                if local_write.write_all(&buf[..n]).is_err() {
                                                    break;
                                                }
                                            }
                                            Err(_) => break,
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to create SSH channel: {}", e);
                            }
                        }
                    });
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // No connection ready, sleep briefly
                    thread::sleep(std::time::Duration::from_millis(100));
                }
                Err(e) => {
                    eprintln!("Failed to accept connection: {}", e);
                    break;
                }
            }
        }
    });

    Ok(())
}
