use unicode_width::UnicodeWidthStr;

use super::common::is_blank_line;
use super::headings::{content_start, rule};
use crate::features::check_markdown::rule::{Context, Report, Rule, RuleMeta};
use crate::shared::tree::Kind;

rule!(
    Md055,
    ["MD055", "table-pipe-style"],
    "Table pipe style",
    ["table"]
);
rule!(
    Md056,
    ["MD056", "table-column-count"],
    "Table column count",
    ["table"]
);
rule!(
    Md058,
    ["MD058", "blanks-around-tables"],
    "Tables should be surrounded by blank lines",
    ["table"]
);
rule!(
    Md060,
    ["MD060", "table-column-style"],
    "Table column style",
    ["table"]
);

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Piece {
    Divider(usize),
    Whitespace(usize, usize),
    Content(usize, usize),
}

pub struct Row {
    pub line: usize,
    pub start: usize,
    pub end: usize,
    pub pieces: Vec<Piece>,
    pub leading: bool,
    pub trailing: bool,
    pub cells: Vec<usize>,
}

pub struct Table {
    pub first: usize,
    pub last: usize,
    pub rows: Vec<Row>,
}

fn is_ws(byte: u8) -> bool {
    byte == b' ' || byte == b'\t'
}

fn row(ctx: &Context<'_>, line: usize, region: usize, delimiter: bool) -> Row {
    let (_, end) = ctx.source.line_range(line);
    let bytes = ctx.source.text.as_bytes();
    let mut at = region;
    while at < end && is_ws(bytes[at]) {
        at += 1;
    }
    let start = if delimiter { region } else { at };
    let mut pieces = Vec::new();
    while at < end {
        if bytes[at] == b'|' {
            pieces.push(Piece::Divider(at));
            at += 1;
        } else if is_ws(bytes[at]) {
            let from = at;
            while at < end && is_ws(bytes[at]) {
                at += 1;
            }
            pieces.push(Piece::Whitespace(from, at));
        } else {
            let from = at;
            let mut last = at;
            while at < end && bytes[at] != b'|' {
                if bytes[at] == b'\\' && at + 1 < end {
                    at += 1;
                }
                if !is_ws(bytes[at]) {
                    last = at;
                }
                at += 1;
            }
            let content_end = last + 1;
            pieces.push(Piece::Content(from, content_end));
            if content_end < at {
                pieces.push(Piece::Whitespace(content_end, at));
            }
        }
    }
    let significant: Vec<&Piece> = pieces
        .iter()
        .filter(|p| !matches!(p, Piece::Whitespace(..)))
        .collect();
    let leading = matches!(significant.first(), Some(Piece::Divider(_)));
    let trailing = significant.len() > 1 && matches!(significant.last(), Some(Piece::Divider(_)));
    let dividers: Vec<usize> = pieces
        .iter()
        .filter_map(|p| {
            if let Piece::Divider(at) = p {
                Some(*at)
            } else {
                None
            }
        })
        .collect();
    let mut cells = Vec::new();
    if !leading {
        cells.push(start);
    }
    let usable = dividers.len() - usize::from(trailing);
    cells.extend(dividers.iter().take(usable).copied());
    Row {
        line,
        start,
        end,
        pieces,
        leading,
        trailing,
        cells,
    }
}

#[must_use]
pub fn tables<'c>(ctx: &Context<'c>) -> &'c [Table] {
    ctx.cache.tables.get_or_init(|| compute_tables(ctx))
}

fn compute_tables(ctx: &Context<'_>) -> Vec<Table> {
    ctx.tree
        .iter()
        .filter(|(_, n)| matches!(n.kind, Kind::Table))
        .map(|(id, node)| {
            let first = ctx.source.line_of(node.start);
            let trimmed = ctx.source.text[node.start..node.end].trim_end();
            let last = ctx
                .source
                .line_of(node.start + trimmed.len().saturating_sub(1));
            let last = (first + 2..=last)
                .find(|&line| {
                    ctx.source
                        .line(line)
                        .trim_start_matches([' ', '\t', '>'])
                        .starts_with(":::")
                })
                .map_or(last, |line| line - 1);
            let rows = (first..=last)
                .map(|line| {
                    let region = if line == first {
                        node.start
                    } else {
                        content_start(ctx, id, line)
                    };
                    let (line_start, line_end) = ctx.source.line_range(line);
                    row(
                        ctx,
                        line,
                        region.clamp(line_start, line_end),
                        line == first + 1,
                    )
                })
                .collect();
            Table { first, last, rows }
        })
        .collect()
}

fn column(ctx: &Context<'_>, offset: usize) -> usize {
    ctx.source.column_of(offset)
}

impl Rule for Md055 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let style = ctx.str_option("style", "consistent");
        let style = if style.is_empty() {
            "consistent"
        } else {
            style
        };
        let mut expected = style.to_owned();
        let mut expected_leading =
            expected != "no_leading_or_trailing" && expected != "trailing_only";
        let mut expected_trailing =
            expected != "no_leading_or_trailing" && expected != "leading_only";
        for table in tables(ctx) {
            if style == "per_table" {
                "consistent".clone_into(&mut expected);
            }
            for row in &table.rows {
                let actual = match (row.leading, row.trailing) {
                    (true, true) => "leading_and_trailing",
                    (true, false) => "leading_only",
                    (false, true) => "trailing_only",
                    (false, false) => "no_leading_or_trailing",
                };
                if expected == "consistent" {
                    actual.clone_into(&mut expected);
                    expected_leading = row.leading;
                    expected_trailing = row.trailing;
                }
                if row.leading != expected_leading {
                    let which = if expected_leading {
                        "Missing"
                    } else {
                        "Unexpected"
                    };
                    report
                        .add(row.line)
                        .detail(format!(
                            "Expected: {expected}; Actual: {actual}; {which} leading pipe"
                        ))
                        .range(column(ctx, row.start), 1);
                }
                if row.trailing != expected_trailing {
                    let which = if expected_trailing {
                        "Missing"
                    } else {
                        "Unexpected"
                    };
                    report
                        .add(row.line)
                        .detail(format!(
                            "Expected: {expected}; Actual: {actual}; {which} trailing pipe"
                        ))
                        .range(column(ctx, row.end) - 1, 1);
                }
            }
        }
    }
}

impl Rule for Md056 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        for table in tables(ctx) {
            let mut expected = 0;
            for row in &table.rows {
                let actual = row.cells.len();
                if expected == 0 {
                    expected = actual;
                }
                if actual == expected {
                    continue;
                }
                let end = column(ctx, row.end) - 1;
                let finding = report.add(row.line);
                if actual < expected {
                    finding
                        .detail(format!("Expected: {expected}; Actual: {actual}; Too few cells, row will be missing data"))
                        .range(end, 1);
                } else {
                    let start = column(ctx, row.cells[expected]);
                    finding
                        .detail(format!("Expected: {expected}; Actual: {actual}; Too many cells, extra data will be missing"))
                        .range(start, end - start + 1);
                }
            }
        }
    }
}

impl Rule for Md058 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let body = ctx.source.body_line;
        let blank = |index: Option<usize>| {
            index.is_none_or(|i| {
                i < body || i >= ctx.source.line_count() || is_blank_line(ctx.line(i))
            })
        };
        for table in tables(ctx) {
            if !blank(table.first.checked_sub(1)) {
                report.context(table.first, ctx.line(table.first).trim(), false, false);
            }
            if !blank(Some(table.last + 1)) {
                report.context(table.last, ctx.line(table.last).trim(), false, false);
            }
        }
    }
}

fn divider_columns(ctx: &Context<'_>, row: &Row) -> Vec<(usize, usize)> {
    let line_start = ctx.source.line_range(row.line).0;
    row.pieces
        .iter()
        .filter_map(|p| {
            if let Piece::Divider(at) = *p {
                Some((column(ctx, at), ctx.source.text[line_start..at].width()))
            } else {
                None
            }
        })
        .collect()
}

fn check_aligned(ctx: &Context<'_>, rows: &[Row], detail: &str) -> Vec<(usize, usize, String)> {
    let mut errors = Vec::new();
    let Some((header, rest)) = rows.split_first() else {
        return errors;
    };
    let header_columns: Vec<usize> = divider_columns(ctx, header).iter().map(|c| c.1).collect();
    for row in rest {
        let mut remaining = header_columns.clone();
        for (actual, effective) in divider_columns(ctx, row) {
            if remaining.is_empty() {
                continue;
            }
            if let Some(pos) = remaining.iter().position(|&c| c == effective) {
                remaining.remove(pos);
            } else {
                errors.push((row.line, actual, detail.to_owned()));
            }
        }
    }
    errors
}

impl Rule for Md060 {
    fn meta(&self) -> &'static RuleMeta {
        &Self::META
    }
    fn check(&self, ctx: &Context<'_>, report: &mut Report) {
        let style = ctx.str_option("style", "any");
        let style = if style.is_empty() { "any" } else { style };
        let aligned_allowed = style == "any" || style == "aligned";
        let compact_allowed = style == "any" || style == "compact";
        let tight_allowed = style == "any" || style == "tight";
        let aligned_delimiter = ctx.bool_option("aligned_delimiter", false);
        for table in tables(ctx) {
            let rows = &table.rows;
            let mut aligned = Vec::new();
            if aligned_allowed {
                aligned = check_aligned(
                    ctx,
                    rows,
                    "Table pipe does not align with header for style \"aligned\"",
                );
            }
            let mut compact = Vec::new();
            let mut tight = Vec::new();
            if (compact_allowed || tight_allowed) && !(aligned_allowed && aligned.is_empty()) {
                if aligned_delimiter {
                    let errors = check_aligned(
                        ctx,
                        &rows[..rows.len().min(2)],
                        "Table pipe does not align with header for option \"aligned_delimiter\"",
                    );
                    compact.extend(errors.iter().cloned());
                    tight.extend(errors);
                }
                for row in rows {
                    let pieces = &row.pieces;
                    for (index, piece) in pieces.iter().enumerate() {
                        let Piece::Divider(at) = *piece else { continue };
                        let col = column(ctx, at);
                        let push = |target: &mut Vec<(usize, usize, String)>, detail: &str| {
                            target.push((row.line, col, detail.to_owned()));
                        };
                        if let Some(previous) = index.checked_sub(1).map(|i| pieces[i]) {
                            if let Piece::Whitespace(s, e) = previous {
                                if e - s != 1 {
                                    push(
                                        &mut compact,
                                        "Table pipe has extra space to the left for style \"compact\"",
                                    );
                                }
                                push(
                                    &mut tight,
                                    "Table pipe has space to the left for style \"tight\"",
                                );
                            } else {
                                push(
                                    &mut compact,
                                    "Table pipe is missing space to the left for style \"compact\"",
                                );
                            }
                        }
                        if let Some(&next) = pieces.get(index + 1) {
                            if let Piece::Whitespace(s, e) = next {
                                if e != row.end {
                                    if e - s != 1 {
                                        push(
                                            &mut compact,
                                            "Table pipe has extra space to the right for style \"compact\"",
                                        );
                                    }
                                    push(
                                        &mut tight,
                                        "Table pipe has space to the right for style \"tight\"",
                                    );
                                }
                            } else {
                                push(
                                    &mut compact,
                                    "Table pipe is missing space to the right for style \"compact\"",
                                );
                            }
                        }
                    }
                }
            }
            let mut chosen = aligned;
            if compact_allowed && (!aligned_allowed || compact.len() < chosen.len()) {
                chosen = compact;
            }
            if tight_allowed
                && (tight.len() < chosen.len() || (!aligned_allowed && !compact_allowed))
            {
                chosen = tight;
            }
            for (line, col, detail) in chosen {
                report.add(line).detail(detail).range(col, 1);
            }
        }
    }
}
