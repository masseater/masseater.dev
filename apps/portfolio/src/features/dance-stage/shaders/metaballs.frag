// note: 頭、両手首、両足首、腰の 6 か所に光る玉を置き、近づくと表面が溶け合って 1 つの塊になるように描く。
void main() {
  int ids[6] = int[6](0, 15, 16, 27, 28, 23);
  float field = 0.0;
  vec3 tint = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float d = dist(uv, joint(ids[i]));
    float w = 0.004 / (d * d + 0.0005);
    field += w;
    tint += hsv(vec3(float(i) / 6.0, 0.7, 1.0)) * w;
  }
  tint /= max(field, 0.001);
  vec3 c = rgb(uv) * 0.3;
  float surface = smoothstep(0.9, 1.1, field);
  vec3 ball = tint * (0.6 + 0.4 * smoothstep(1.0, 3.0, field));
  c = mix(c, ball, surface);
  outColor = vec4(c, 1.0);
}
