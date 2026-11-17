use crate::shared::text::quote;

const LOCAL: &str = "./";
const SELF_REPOSITORY: &str = "$/";

#[must_use]
pub fn local_path(spec: &str) -> Option<&str> {
    spec.strip_prefix(LOCAL)
        .or_else(|| spec.strip_prefix(SELF_REPOSITORY))
}

#[must_use]
pub fn is_self_reference_with_ref(spec: &str) -> bool {
    spec.strip_prefix(SELF_REPOSITORY)
        .is_some_and(|rest| rest.contains('@'))
}

#[must_use]
pub fn self_reference_error(spec: &str) -> String {
    format!(
        "self repository reference {} must not include @{{ref}}. \"$/\" always resolves to the commit of the running workflow. see https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsuses",
        quote(spec)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_local_and_self_repository_paths() {
        assert_eq!(local_path("./a/b"), Some("a/b"));
        assert_eq!(
            local_path("$/.github/actions/setup"),
            Some(".github/actions/setup")
        );
        assert_eq!(local_path("owner/repo@v1"), None);
        assert!(is_self_reference_with_ref("$/actions/x@v1"));
        assert!(!is_self_reference_with_ref("./actions/x@v1"));
    }
}
