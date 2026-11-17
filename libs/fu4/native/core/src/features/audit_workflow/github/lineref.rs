use thiserror::Error;

use crate::features::audit_workflow::{github::pktline, utils::once::static_regex};

static_regex!(
    LINE_REF_PATTERN,
    r"(?x)                    # verbose mode
        ^                          # start of string
        (?P<obj_id>[0-9a-f]{40} )  # object ID
        (?-x: )                    # single space (temporarily disable verbose)
        (?P<ref_name>\S+)          # ref name
        (                          # start optional peeled group
          (?-x: )                  # space
          peeled:                  # 'peeled:' label
          (?P<peeled_obj_id>
            [0-9a-f]{40}           # peeled object ID
          )
        )?                         # end optional peeled group
        $                          # end of string
        "
);

#[derive(Debug, Error)]
pub(crate) enum LineRefError {
    #[error("Git pkt-line decoding error")]
    Packet(#[from] pktline::PktLineError),

    #[error("invalid reference: not valid UTF-8")]
    BadRefEncoding(#[from] std::str::Utf8Error),

    #[error("malformed line ref: {line}")]
    BadLine { line: String },
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct LineRef<'a> {
    pub(crate) obj_id: &'a str,

    pub(crate) ref_name: &'a str,

    pub(crate) peeled_obj_id: Option<&'a str>,
}

impl<'a> LineRef<'a> {
    pub(crate) fn parse(data: pktline::Data<'a>) -> Result<Self, LineRefError> {
        let mut line = str::from_utf8(data.as_ref()).map_err(LineRefError::BadRefEncoding)?;

        if line.ends_with('\n') {
            line = &line[..line.len() - 1];
        }

        let captures = LINE_REF_PATTERN
            .captures(line)
            .ok_or_else(|| LineRefError::BadLine {
                line: line.to_string(),
            })?;

        Ok(Self {
            obj_id: captures
                .name("obj_id")
                .expect("internal error: mandatory capture missing from lineref pattern")
                .as_str(),
            ref_name: captures
                .name("ref_name")
                .expect("internal error: mandatory capture missing from lineref pattern")
                .as_str(),
            peeled_obj_id: captures.name("peeled_obj_id").map(|m| m.as_str()),
        })
    }
}

pub(crate) struct LineRefIterator<'a> {
    inner: pktline::PacketIterator<'a>,
}

impl<'a> LineRefIterator<'a> {
    pub(crate) fn new(data: &'a [u8]) -> Self {
        Self {
            inner: pktline::PacketIterator::new(data),
        }
    }
}

impl<'a> Iterator for LineRefIterator<'a> {
    type Item = Result<LineRef<'a>, LineRefError>;

    fn next(&mut self) -> Option<Self::Item> {
        match self.inner.next()? {
            Ok(pktline::Packet::Data(data)) => Some(LineRef::parse(data)),
            Ok(pktline::Packet::Flush) => None,

            Ok(pktline::Packet::Delim) => Some(Err(LineRefError::Packet(
                pktline::PktLineError::UnexpectedControl { control: 1 },
            ))),
            Err(e) => Some(Err(LineRefError::Packet(e))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_iterator() {
        let resp = r"0032ac7cfa9fb7b5d6c417847e49e375aae20819a06f HEAD
003dac7cfa9fb7b5d6c417847e49e375aae20819a06f refs/heads/main
003e3e793ac5aba04cf8157e52e796de2d808f800039 refs/pull/1/head
006a1accca34bff60347d96faaf713d328ca1250d37b refs/tags/v1 peeled:3fdd4fca8fc76b254cefefca92381c41b28d1f0d
006cbcb36f3d551340e11b88c376e74e8ae77fc6cf0b refs/tags/v1.0 peeled:3fdd4fca8fc76b254cefefca92381c41b28d1f0d
006e06f9d47abf340b709b412900a7b3ce33557d32b5 refs/tags/v1.0.0 peeled:3fdd4fca8fc76b254cefefca92381c41b28d1f0d
0000
";

        let refs: Result<Vec<_>, _> = LineRefIterator::new(resp.as_bytes()).collect();
        let refs = refs.unwrap();

        assert_eq!(
            refs,
            &[
                LineRef {
                    obj_id: "ac7cfa9fb7b5d6c417847e49e375aae20819a06f",
                    ref_name: "HEAD",
                    peeled_obj_id: None,
                },
                LineRef {
                    obj_id: "ac7cfa9fb7b5d6c417847e49e375aae20819a06f",
                    ref_name: "refs/heads/main",
                    peeled_obj_id: None,
                },
                LineRef {
                    obj_id: "3e793ac5aba04cf8157e52e796de2d808f800039",
                    ref_name: "refs/pull/1/head",
                    peeled_obj_id: None,
                },
                LineRef {
                    obj_id: "1accca34bff60347d96faaf713d328ca1250d37b",
                    ref_name: "refs/tags/v1",
                    peeled_obj_id: Some("3fdd4fca8fc76b254cefefca92381c41b28d1f0d"),
                },
                LineRef {
                    obj_id: "bcb36f3d551340e11b88c376e74e8ae77fc6cf0b",
                    ref_name: "refs/tags/v1.0",
                    peeled_obj_id: Some("3fdd4fca8fc76b254cefefca92381c41b28d1f0d"),
                },
                LineRef {
                    obj_id: "06f9d47abf340b709b412900a7b3ce33557d32b5",
                    ref_name: "refs/tags/v1.0.0",
                    peeled_obj_id: Some("3fdd4fca8fc76b254cefefca92381c41b28d1f0d"),
                },
            ]
        );
    }
}
