// note: 床に貼った絵を、正面からは細長く引き伸ばされて何か分からない形にしておく。6 秒ごとに視点が床すれすれの決まった位置まで動くと、そこでだけ踊る人が正しい形に見える。
void main() {
  float phase = fract(time / 6.0);
  float k = smoothstep(0.35, 0.65, phase) * (1.0 - smoothstep(0.85, 1.0, phase));
  vec2 p = uv - 0.5;
  vec2 stretched = vec2(p.x * 0.35 + p.y * 0.55, p.y * 0.25 - p.x * 0.05) + 0.5;
  vec2 q = mix(stretched, uv, k);
  vec3 floor_ = mix(vec3(0.75, 0.62, 0.45), vec3(0.6, 0.48, 0.35), noise(uv * vec2(4.0, 40.0)));
  vec3 c = mix(floor_, rgb(q), inside(q) * matte(q));
  outColor = vec4(c, 1.0);
}
