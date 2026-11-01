// note: 細いピンを格子に刺した板に、左上から斜めに光を当てる。暗い所ほどピンを長く出して長い影を落とし、影の濃淡だけで踊る人を描く。
void main() {
  vec2 grid = vec2(160.0, 90.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  vec3 c = vec3(0.92, 0.92, 0.9);
  for (int k = 0; k < 4; k++) {
    vec2 source = cell - vec2(float(k), float(k)) * 0.5;
    vec2 from = floor(source);
    float length_ = (1.0 - luma(rgb((from + 0.5) / grid))) * 3.0;
    vec2 d = (cell + local) - (from + 0.5);
    float along = (d.x + d.y) * 0.5;
    float across = abs(d.x - d.y);
    float shadow = step(0.0, along) * step(along, length_) * step(across, 0.5);
    c = min(c, vec3(mix(0.92, 0.18, shadow)));
  }
  float head = smoothstep(0.18, 0.1, length(local - 0.5));
  c = mix(c, vec3(0.75), head * 0.5);
  outColor = vec4(c, 1.0);
}
