// note: 6 コマの踊りを 1 本ずつの細い縦縞に分けて 1 枚に織り込む。その上を、6 本に 1 本だけ透明な縞の板が左右に行き来し、板の下でだけ絵が動いて見える。
void main() {
  float px = floor(uv.x * resolution.x / 3.0);
  float slot = mod(px, 6.0);
  float start = floor(time / 3.0) * 3.0;
  vec3 woven = pastRgb(uv, start + slot * 0.12);
  float sheet = 0.5 + 0.3 * sin(time * 0.6);
  float covered = step(abs(uv.x - sheet), 0.3);
  float open = step(abs(slot - mod(floor(time * 8.0), 6.0)), 0.1);
  vec3 c = mix(woven, woven * open, covered);
  c = mix(c, vec3(0.0), covered * 0.15);
  outColor = vec4(c, 1.0);
}
