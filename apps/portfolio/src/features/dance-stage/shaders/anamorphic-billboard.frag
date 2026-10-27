// note: ビルの角を挟んで曲がる 2 面の大画面を描き、画面の中に奥へ続く箱の部屋を遠近の線で見せる。踊る人は箱の縁より大きく描くので、枠を越えて手前へ飛び出して見える。
void main() {
  vec3 c = mix(vec3(0.55, 0.6, 0.7), vec3(0.75, 0.75, 0.78), uv.y);
  vec2 corner = vec2(0.5, 0.0);
  float topL = 0.12 + (0.5 - uv.x) * 0.15;
  float botL = 0.85 - (0.5 - uv.x) * 0.15;
  float topR = 0.12 + (uv.x - 0.5) * 0.15;
  float botR = 0.85 - (uv.x - 0.5) * 0.15;
  float top = mix(topL, topR, step(0.5, uv.x));
  float bot = mix(botL, botR, step(0.5, uv.x));
  float inScreen = step(0.12, uv.x) * step(uv.x, 0.88) * step(top, uv.y) * step(uv.y, bot);
  if (inScreen > 0.5) {
    vec2 q = vec2((uv.x - 0.12) / 0.76, (uv.y - top) / (bot - top));
    vec2 inner = abs(q - vec2(0.5, 0.55));
    float wall = max(inner.x / 0.5, inner.y / 0.45);
    float depth = 1.0 / max(wall, 0.3);
    vec3 room = vec3(0.92, 0.9, 0.86) * (0.5 + 0.5 * wall);
    room = mix(room, vec3(0.7), step(0.97, fract(depth * 3.0)));
    room = mix(room, vec3(0.6, 0.62, 0.66), step(wall, 0.45));
    c = room;
    c = mix(c, c * 0.5, smoothstep(0.08, 0.0, length((q - vec2(0.5, 0.92)) * vec2(1.0, 4.0)) - 0.15));
  }
  c = mix(c, vec3(0.2), smoothstep(0.003, 0.0, abs(uv.x - 0.5) * aspect()) * inScreen);
  vec2 p = (uv - vec2(0.5, 0.58)) / 1.25 + vec2(0.5, 0.5);
  float m = matte(p) * inside(p);
  c = mix(c, rgb(p), m);
  outColor = vec4(c, 1.0);
}
