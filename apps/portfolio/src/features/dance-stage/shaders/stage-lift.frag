// note: 8 秒の前半は床の穴から踊る人を床ごとせり上げ、後半は丸い回り舞台に乗せて回し、場面が替わるように左右を裏返す。
void main() {
  float phase = mod(time, 8.0);
  vec3 c = plate(uv) * 0.6;
  float floorY = 0.86;
  vec3 floorCol = vec3(0.35, 0.25, 0.18);
  if (phase < 3.5) {
    float rise = smoothstep(0.0, 3.0, phase);
    vec2 p = uv + vec2(0.0, (1.0 - rise) * 0.9);
    float m = matte(p) * step(uv.y, floorY);
    c = mix(c, rgb(p), m);
    c = mix(c, floorCol, step(floorY, uv.y));
    c = mix(c, vec3(0.05), step(floorY, uv.y) * step(abs(uv.x - 0.5), 0.2) * step(uv.y, floorY + 0.02));
  } else {
    float spin = (phase - 3.5) * 1.4;
    float squash = cos(spin);
    float cx = 0.5;
    float x = (uv.x - cx) / max(abs(squash), 0.05);
    vec2 p = vec2(cx + mix(x, -x, step(squash, 0.0)), uv.y);
    c = mix(c, floorCol, step(floorY, uv.y));
    vec2 e = (uv - vec2(0.5, floorY + 0.03)) * vec2(aspect(), 6.0);
    float disk = step(length(e), 0.5);
    float stripes = step(0.5, fract(atan(e.y, e.x) / PI * 4.0 + spin / PI));
    c = mix(c, mix(vec3(0.5, 0.4, 0.3), vec3(0.6, 0.5, 0.35), stripes), disk);
    c = mix(c, rgb(p) * mix(1.0, 0.7, step(squash, 0.0)), matte(p) * inside(p));
  }
  outColor = vec4(c, 1.0);
}
