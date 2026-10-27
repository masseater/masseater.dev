// note: 4 拍ごとに、指を鳴らしたように手首の先に小さな光の輪を出し、その瞬間に服の色と背景の色をまとめて切り替える。
void main() {
  float look = mod(floor(beatCount / 4.0), 3.0);
  vec3 base = rgb(uv);
  float m = matte(uv);
  vec3 bg = plate(uv);
  vec3 bgs[3] = vec3[3](vec3(1.0), vec3(0.7, 0.85, 1.1), vec3(1.15, 0.85, 0.7));
  vec3 hues[3] = vec3[3](vec3(1.0), vec3(1.2, 0.7, 0.8), vec3(0.7, 1.1, 0.9));
  int k = int(look);
  vec3 c = mix(bg * bgs[k], base * hues[k], m);
  float since = mod(beatCount, 4.0) + beat;
  float ring = abs(dist(uv, joint(16)) - since * 0.3);
  c += vec3(1.0, 0.95, 0.7) * smoothstep(0.01, 0.0, ring) * exp(-since * 4.0);
  outColor = vec4(c, 1.0);
}
