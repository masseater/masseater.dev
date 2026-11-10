use anyhow::{Result, anyhow};
use jpeg_encoder::{ColorType, Encoder};

use crate::video::{Clip, PIXELS};
use crate::{HEIGHT, WIDTH};

const STEP: usize = 2;
const TILE_WIDTH: usize = 160;
const TILE_HEIGHT: usize = 90;
const COLUMNS: usize = 12;
const QUALITY: u8 = 82;
const CHANNELS: usize = 3;
const SCALE: usize = WIDTH / TILE_WIDTH;
const CELL: usize = TILE_WIDTH * 2;

const _: () = assert!(WIDTH.is_multiple_of(TILE_WIDTH) && HEIGHT / TILE_HEIGHT == SCALE);

fn average(source: &[u8], channels: usize, x: usize, y: usize, channel: usize) -> u8 {
    let sum: usize = (0..SCALE * SCALE)
        .map(|offset| {
            let pixel = (y * SCALE + offset / SCALE) * WIDTH + x * SCALE + offset % SCALE;
            usize::from(source[pixel * channels + channel])
        })
        .sum();
    ((sum + SCALE * SCALE / 2) / (SCALE * SCALE)) as u8
}

struct Sheet {
    rgb: Vec<u8>,
    width: usize,
}

impl Sheet {
    fn draw(&mut self, tile: usize, frame: &[u8], mask: &[u8]) {
        let (left, top) = (tile % COLUMNS * CELL, tile / COLUMNS * TILE_HEIGHT);
        for y in 0..TILE_HEIGHT {
            for x in 0..TILE_WIDTH {
                let color = (top + y) * self.width + left + x;
                let matte = color + TILE_WIDTH;
                for channel in 0..CHANNELS {
                    self.rgb[color * CHANNELS + channel] = average(frame, CHANNELS, x, y, channel);
                    self.rgb[matte * CHANNELS + channel] = average(mask, 1, x, y, 0);
                }
            }
        }
    }
}

fn tiles(clip: &Clip, masks: &[u8]) -> (Sheet, usize) {
    let rows = clip.count.div_ceil(STEP).div_ceil(COLUMNS);
    let width = COLUMNS * CELL;
    let mut sheet = Sheet {
        rgb: vec![0; width * rows * TILE_HEIGHT * CHANNELS],
        width,
    };
    for (tile, index) in (0..clip.count).step_by(STEP).enumerate() {
        let mask = &masks[index * PIXELS..(index + 1) * PIXELS];
        sheet.draw(tile, clip.frame(index), mask);
    }
    (sheet, rows * TILE_HEIGHT)
}

pub(crate) fn history(clip: &Clip, masks: &[u8]) -> Result<Vec<u8>> {
    let (sheet, height) = tiles(clip, masks);
    let mut jpeg = Vec::new();
    Encoder::new(&mut jpeg, QUALITY)
        .encode(
            &sheet.rgb,
            sheet.width as u16,
            height as u16,
            ColorType::Rgb,
        )
        .map_err(|error| anyhow!("history.jpg を書けない: {error}"))?;
    Ok(jpeg)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tiles_put_every_second_frame_beside_its_mask() {
        let count = 27;
        let rgb = (0..count)
            .flat_map(|index| vec![index as u8 * 4; PIXELS * CHANNELS])
            .collect();
        let masks = (0..count)
            .flat_map(|index| vec![255 - index as u8; PIXELS])
            .collect::<Vec<_>>();
        let (sheet, height) = tiles(&Clip { rgb, count }, &masks);
        assert_eq!((sheet.width, height), (3840, 180));
        let thirteenth = (TILE_HEIGHT * sheet.width + CELL) * CHANNELS;
        assert_eq!(sheet.rgb[thirteenth], 26 * 4);
        assert_eq!(sheet.rgb[thirteenth + TILE_WIDTH * CHANNELS], 255 - 26);
        assert_eq!(sheet.rgb[thirteenth + CELL * CHANNELS], 0);
    }
}
