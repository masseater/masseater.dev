// note: 生成りの地に、手首と足首と頭から円や線を出し、帯域ごとの強さで大きさと色を変えて、抽象的な形が曲に合わせて鳴るように見せる。踊る人はうっすら残す。
void main() {
  vec3 c = mix(vec3(0.96, 0.93, 0.86), rgb(uv), 0.12 + 0.1 * matte(uv));
  int ids[5] = int[5](0, 15, 16, 27, 28);
  for (int i = 0; i < 5; i++) {
    vec2 j = joint(ids[i]);
    float v = bands[i + 1];
    float r = 0.03 + v * 0.09;
    float d = dist(uv, j);
    vec3 col = hsv(vec3(float(i) * 0.19 + 0.02, 0.75, 0.9));
    c = mix(c, col, smoothstep(r, r - 0.004, d) * 0.85);
    c = mix(c, vec3(0.1), smoothstep(0.004, 0.0, abs(d - r - 0.02 - 0.03 * bands[0])) * 0.6);
  }
  c = mix(c, vec3(0.12), smoothstep(0.003, 0.0, segment(uv, joint(15), joint(28))) * 0.8);
  c = mix(c, vec3(0.8, 0.15, 0.1), smoothstep(0.005, 0.0, segment(uv, joint(16), joint(27))) * bands[3]);
  float tri = step(abs(uv.x - 0.15) * 2.0, (uv.y - 0.15)) * step(uv.y, 0.15 + 0.2 * bands[6]);
  c = mix(c, vec3(0.2, 0.3, 0.7), tri * 0.8);
  outColor = vec4(c, 1.0);
}
