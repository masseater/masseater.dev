use tauri::{AppHandle, async_runtime};
use tauri_plugin_dialog::DialogExt;

use crate::failure::{Failure, Outcome};
use crate::model::{Manuscript, Paragraph};

const UNTITLED: &str = "無題";
const EXTENSION: &str = "txt";
const FILTER: &str = "テキスト";
const NAME_LIMIT: usize = 40;
const FORBIDDEN: &[char] = &['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

fn name_of(manuscript: &Manuscript) -> String {
    let wanted = manuscript
        .title
        .as_ref()
        .map_or(manuscript.excerpt.as_str(), |title| title.text.as_str());
    let cleaned: String = wanted
        .chars()
        .filter(|character| !character.is_control() && !FORBIDDEN.contains(character))
        .take(NAME_LIMIT)
        .collect();
    let trimmed = cleaned.trim();
    let name = if trimmed.is_empty() {
        UNTITLED
    } else {
        trimmed
    };
    format!("{name}.{EXTENSION}")
}

fn text_of(paragraphs: &[Paragraph]) -> String {
    let mut text = paragraphs
        .iter()
        .map(|paragraph| paragraph.text.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    text.push('\n');
    text
}

pub async fn save(
    app: AppHandle,
    manuscript: &Manuscript,
    paragraphs: &[Paragraph],
) -> Outcome<bool> {
    let name = name_of(manuscript);
    let chosen = async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_file_name(name)
            .add_filter(FILTER, &[EXTENSION])
            .blocking_save_file()
    })
    .await
    .map_err(|error| Failure::new(error.to_string()))?;
    let Some(chosen) = chosen else {
        return Ok(false);
    };
    let path = chosen
        .into_path()
        .map_err(|error| Failure::new(error.to_string()))?;
    std::fs::write(path, text_of(paragraphs))?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::{name_of, text_of};
    use crate::model::{Manuscript, Paragraph, Title, TitleAuthor};

    fn manuscript(title: Option<&str>, excerpt: &str) -> Manuscript {
        Manuscript {
            id: "m".to_owned(),
            title: title.map(|text| Title {
                text: text.to_owned(),
                by: TitleAuthor::Writer,
            }),
            excerpt: excerpt.to_owned(),
            updated_at: 0,
        }
    }

    #[test]
    fn names_the_file_after_the_title_without_path_characters() {
        assert_eq!(
            name_of(&manuscript(Some("夜/明け:前"), "本文")),
            "夜明け前.txt"
        );
        assert_eq!(name_of(&manuscript(None, "  書き出し  ")), "書き出し.txt");
        assert_eq!(name_of(&manuscript(None, "")), "無題.txt");
    }

    #[test]
    fn writes_one_paragraph_per_line() {
        let paragraphs = ["一行目", "", "三行目"].map(|text| Paragraph {
            id: text.to_owned(),
            text: text.to_owned(),
        });
        assert_eq!(text_of(&paragraphs), "一行目\n\n三行目\n");
    }
}
