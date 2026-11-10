use rayon::prelude::*;

use crate::inpaint::telea;
use crate::video::{Clip, PIXELS};
use crate::{HEIGHT, WIDTH};

const STEP: usize = 3;
const PERSON_KERNEL: usize = 61;
const PERSON_THRESHOLD: u8 = 8;
const ENOUGH: usize = 8;
const HOLE_KERNEL: usize = 9;
const INPAINT_RADIUS: usize = 9;
const CHANNELS: usize = 3;

fn spread(source: &[u8], length: usize, stride: usize, radius: usize, target: &mut [u8]) {
    for position in 0..length {
        let from = position.saturating_sub(radius);
        let to = (position + radius + 1).min(length);
        target[position * stride] = (from..to)
            .map(|index| source[index * stride])
            .max()
            .unwrap_or(0);
    }
}

pub(crate) fn dilate(gray: &[u8], kernel: usize) -> Vec<u8> {
    let radius = kernel / 2;
    let mut across = vec![0; PIXELS];
    for y in 0..HEIGHT {
        let row = y * WIDTH..(y + 1) * WIDTH;
        spread(&gray[row.clone()], WIDTH, 1, radius, &mut across[row]);
    }
    let mut down = vec![0; PIXELS];
    for x in 0..WIDTH {
        spread(&across[x..], HEIGHT, WIDTH, radius, &mut down[x..]);
    }
    down
}

fn middle(values: &mut [u8]) -> u8 {
    if values.is_empty() {
        return 0;
    }
    values.sort_unstable();
    let half = values.len() / 2;
    if values.len() % 2 == 1 {
        values[half]
    } else {
        u16::midpoint(u16::from(values[half - 1]), u16::from(values[half])) as u8
    }
}

fn median(clip: &Clip, people: &[Vec<u8>]) -> (Vec<u8>, Vec<u8>) {
    let pixels: Vec<([u8; CHANNELS], u8)> = (0..PIXELS)
        .into_par_iter()
        .map(|pixel| {
            let seen: Vec<usize> = (0..people.len())
                .filter(|&sample| people[sample][pixel] <= PERSON_THRESHOLD)
                .collect();
            let color = std::array::from_fn(|channel| {
                let mut values: Vec<u8> = seen
                    .iter()
                    .map(|&sample| clip.frame(sample * STEP)[pixel * CHANNELS + channel])
                    .collect();
                middle(&mut values)
            });
            (color, if seen.len() < ENOUGH { u8::MAX } else { 0 })
        })
        .collect();
    let colors = pixels.iter().flat_map(|(color, _)| *color).collect();
    let holes = pixels.iter().map(|(_, hole)| *hole).collect();
    (colors, holes)
}

pub(crate) fn plate(clip: &Clip, masks: &[u8]) -> Vec<u8> {
    let people: Vec<Vec<u8>> = (0..clip.count)
        .step_by(STEP)
        .collect::<Vec<_>>()
        .into_par_iter()
        .map(|index| dilate(&masks[index * PIXELS..(index + 1) * PIXELS], PERSON_KERNEL))
        .collect();
    let (mut colors, holes) = median(clip, &people);
    telea(&mut colors, &dilate(&holes, HOLE_KERNEL), INPAINT_RADIUS);
    colors
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dilate_spreads_a_point_into_a_square() {
        let mut gray = vec![0; PIXELS];
        gray[100 * WIDTH + 200] = 9;
        let wide = dilate(&gray, 5);
        assert_eq!(
            wide.iter()
                .map(|&value| usize::from(value == 9))
                .sum::<usize>(),
            25
        );
        assert_eq!(wide[98 * WIDTH + 198], 9);
        assert_eq!(wide[97 * WIDTH + 200], 0);
    }

    #[test]
    fn middle_averages_the_two_central_values_and_truncates() {
        assert_eq!(middle(&mut [9, 1, 5]), 5);
        assert_eq!(middle(&mut [4, 1, 9, 7]), 5);
        assert_eq!(middle(&mut []), 0);
    }

    #[test]
    fn plate_removes_a_person_who_keeps_moving() {
        let count = 60;
        let mut rgb = vec![40; count * PIXELS * CHANNELS];
        let mut masks = vec![0; count * PIXELS];
        for index in 0..count {
            let x = 100 + index * 7;
            for y in 150..170 {
                masks[index * PIXELS + y * WIDTH + x] = 255;
                rgb[(index * PIXELS + y * WIDTH + x) * CHANNELS] = 250;
            }
        }
        let background = plate(&Clip { rgb, count }, &masks);
        assert!(background.iter().all(|&value| value == 40));
    }
}
