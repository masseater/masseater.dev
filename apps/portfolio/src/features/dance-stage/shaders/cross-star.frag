// note: 顔の横に、4 本の光の筋が伸びる十字の光を出す。拍のたびに光がきらっと大きくなり、回りながら縮む。
void main() {
  vec3 c = rgb(uv);
  vec2 at = joint(0) + vec2(0.04, -0.03);
  float grow = exp(-beat * 3.0);
  vec2 q = rot((uv - at) * vec2(aspect(), 1.0), beat * 3.0);
  float r = length(q);
  float a = atan(q.y, q.x);
  float spikes = pow(abs(cos(a * 2.0)), 60.0) * smoothstep(0.12 * grow + 0.02, 0.0, r);
  spikes += pow(abs(cos(a * 2.0 + PI * 0.25)), 80.0) * smoothstep(0.05 * grow + 0.01, 0.0, r) * 0.6;
  c += vec3(1.0, 0.97, 0.85) * (spikes + smoothstep(0.012, 0.0, r)) * (0.4 + grow);
  outColor = vec4(c, 1.0);
}
