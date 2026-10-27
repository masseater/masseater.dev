// note: 部屋を斜め上から見下ろした箱庭にする。床をひし形の市松に、奥の 2 枚の壁に部屋の写真を貼り、真ん中に踊る人を立たせる。
void main() {
  vec2 q = (uv - vec2(0.5, 0.62)) * vec2(aspect(), 1.0);
  float w = 0.78;
  float h = 0.36;
  float wall = 0.42;
  vec3 c = vec3(0.12, 0.13, 0.18);
  float diamond = abs(q.x) / w + abs(q.y) / h;
  if (diamond < 1.0) {
    vec2 iso = vec2(q.x / w + q.y / h, -q.x / w + q.y / h) * 4.0;
    c = mix(vec3(0.75, 0.65, 0.5), vec3(0.6, 0.5, 0.38), step(0.5, fract(floor(iso.x) * 0.5 + floor(iso.y) * 0.5)));
  } else if (abs(q.x) < w) {
    float edge = -h * (1.0 - abs(q.x) / w);
    float y = (q.y - (edge - wall)) / wall;
    if (q.y < edge && y > 0.0) {
      float x = q.x < 0.0 ? (q.x + w) / w * 0.5 : 0.5 + q.x / w * 0.5;
      c = plate(vec2(x, y)) * (q.x < 0.0 ? 0.9 : 0.7);
    }
  }
  vec2 sprite = (uv - vec2(0.5, 0.45)) / 0.42 + vec2(0.56, 0.5);
  c = mix(c, rgb(sprite), matte(sprite) * inside(sprite));
  outColor = vec4(c, 1.0);
}
