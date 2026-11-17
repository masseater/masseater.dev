pub fn utf16_slice(text: &str, from: usize, to: usize) -> String {
    let units: Vec<u16> = text.encode_utf16().collect();
    let end = to.min(units.len());
    let start = from.min(end);
    String::from_utf16_lossy(&units[start..end])
}

pub fn utf16_offset(text: &str, byte: usize) -> usize {
    text[..byte].encode_utf16().count()
}

pub fn utf16_length(text: &str) -> usize {
    text.encode_utf16().count()
}

#[cfg(test)]
mod tests {
    use super::{utf16_offset, utf16_slice};

    #[test]
    fn slices_by_utf16_units_like_javascript() {
        assert_eq!(utf16_slice("𠮷野家の牛丼", 0, 3), "𠮷野");
        assert_eq!(utf16_slice("短い", 0, 80), "短い");
    }

    #[test]
    fn converts_byte_offsets_to_utf16_offsets() {
        let text = "𠮷野家";
        assert_eq!(utf16_offset(text, "𠮷".len()), 2);
    }
}
