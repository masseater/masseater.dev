// note: 踊る人の後ろに曲がった LED の壁を立てて山の景色を映し、壁の外は暗い撮影所のまま残す。景色はカメラが横に動くのに合わせて奥ほど遅く流れ、壁の画素の粒がうっすら見える。
void main() {
  vec3 c = vec3(0.04, 0.04, 0.05);
  float curve = 0.08 + 0.12 * pow(abs(uv.x - 0.5) * 2.0, 2.0);
  float bottom = 0.8 - 0.05 * pow(abs(uv.x - 0.5) * 2.0, 2.0);
  if (uv.y > curve && uv.y < bottom && uv.x > 0.03 && uv.x < 0.97) {
    float pan = sin(time * 0.4) * 0.3;
    vec3 sky = mix(vec3(0.95, 0.7, 0.5), vec3(0.4, 0.6, 0.9), 1.0 - uv.y);
    float far = 0.45 + 0.08 * fbm(vec2((uv.x + pan * 0.2) * 4.0, 1.0));
    float near = 0.58 + 0.08 * fbm(vec2((uv.x + pan * 0.6) * 5.0, 5.0));
    vec3 land = sky;
    land = mix(land, vec3(0.45, 0.45, 0.6), step(far, uv.y));
    land = mix(land, vec3(0.2, 0.3, 0.25), step(near, uv.y));
    vec2 px = fract(uv * resolution / 4.0);
    c = land * (0.8 + 0.2 * step(0.3, min(px.x, px.y)));
  }
  vec3 lit = rgb(uv) * vec3(1.05, 0.92, 0.85);
  c = mix(c, lit, matte(uv));
  c = mix(c, vec3(0.15), step(0.9, uv.y) * step(fract(uv.x * 10.0), 0.05));
  outColor = vec4(c, 1.0);
}
