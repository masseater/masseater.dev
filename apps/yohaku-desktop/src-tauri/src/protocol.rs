pub const DATA_DIRECTORY_FLAG: &str = "--data-dir";
pub const PARENT_PID_FLAG: &str = "--parent-pid";
pub const CLAUDE_FLAG: &str = "--claude";

#[cfg(test)]
mod tests {
    use super::{CLAUDE_FLAG, DATA_DIRECTORY_FLAG, PARENT_PID_FLAG};

    const SERVER_FLAGS: &str = include_str!("../../../../libs/yohaku-protocol/src/server-flags.ts");

    fn declared(flag: &str) -> bool {
        let name = flag.trim_start_matches("--");
        SERVER_FLAGS.contains(&format!("\"{name}\""))
    }

    #[test]
    fn flags_match_the_server() {
        assert!(
            declared(DATA_DIRECTORY_FLAG),
            "{DATA_DIRECTORY_FLAG} is not a server flag"
        );
        assert!(
            declared(PARENT_PID_FLAG),
            "{PARENT_PID_FLAG} is not a server flag"
        );
        assert!(declared(CLAUDE_FLAG), "{CLAUDE_FLAG} is not a server flag");
    }
}
