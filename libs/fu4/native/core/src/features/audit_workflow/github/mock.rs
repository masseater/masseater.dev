use std::{
    io::{BufRead as _, BufReader, Read as _, Write as _},
    net::{TcpListener, TcpStream},
    sync::Arc,
};

use super::pktline::Packet;

pub(crate) struct Route {
    method: &'static str,
    path: String,
    status: u16,
    body: Vec<u8>,
}

impl Route {
    pub(crate) fn refs(slug: &str, refs: &[(&str, &str)]) -> Self {
        let mut body = Vec::new();
        for (sha, name) in refs {
            Packet::data(format!("{sha} {name}\n").as_bytes())
                .expect("ref line fits in a packet")
                .encode(&mut body);
        }
        Packet::Flush.encode(&mut body);
        Self {
            method: "POST",
            path: format!("/{slug}.git/git-upload-pack"),
            status: 200,
            body,
        }
    }

    pub(crate) fn json(path: impl Into<String>, body: &serde_json::Value) -> Self {
        Self {
            method: "GET",
            path: path.into(),
            status: 200,
            body: body.to_string().into_bytes(),
        }
    }

    pub(crate) fn missing(method: &'static str, path: impl Into<String>) -> Self {
        Self {
            method,
            path: path.into(),
            status: 404,
            body: Vec::new(),
        }
    }
}

fn reason(status: u16) -> &'static str {
    if status == 200 { "OK" } else { "Not Found" }
}

fn respond(stream: TcpStream, routes: &[Route]) -> std::io::Result<()> {
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut request_line = String::new();
    reader.read_line(&mut request_line)?;
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default().to_owned();
    let target = parts.next().unwrap_or_default();
    let path = target.split('?').next().unwrap_or_default().to_owned();
    let mut length = 0;
    loop {
        let mut header = String::new();
        reader.read_line(&mut header)?;
        let header = header.trim_end();
        if header.is_empty() {
            break;
        }
        if let Some((name, value)) = header.split_once(':')
            && name.eq_ignore_ascii_case("content-length")
        {
            length = value.trim().parse().unwrap_or(0);
        }
    }
    let mut request_body = vec![0; length];
    reader.read_exact(&mut request_body)?;
    let (status, body) = routes
        .iter()
        .find(|route| route.method == method && route.path == path)
        .map_or((404, &[][..]), |route| {
            (route.status, route.body.as_slice())
        });
    let mut stream = stream;
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Length: {length}\r\nConnection: close\r\n\r\n",
        reason = reason(status),
        length = body.len(),
    )?;
    stream.write_all(body)?;
    stream.flush()
}

pub(crate) fn serve(routes: Vec<Route>) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("mock GitHub binds a local port");
    let base = format!(
        "http://{}",
        listener.local_addr().expect("mock GitHub has an address")
    );
    let routes = Arc::new(routes);
    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let routes = Arc::clone(&routes);
            std::thread::spawn(move || respond(stream, &routes));
        }
    });
    base
}
