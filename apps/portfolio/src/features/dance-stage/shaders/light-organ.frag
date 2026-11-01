// note: 低い音を赤、中くらいの音を緑、高い音を青の照明に割り当て、3 つの光を左、上、右から踊る人に当てる。上には帯域ごとの電球を並べ、強さに合わせて灯す。
void main() {
  vec3 base = rgb(uv);
  float m = matte(uv);
  float low = (bands[0] + bands[1]) * 0.5;
  float mid = (bands[3] + bands[4]) * 0.5;
  float high = (bands[6] + bands[7]) * 0.5;
  vec3 light = vec3(0.0);
  light += vec3(1.0, 0.15, 0.1) * low * smoothstep(0.9, 0.0, uv.x);
  light += vec3(0.15, 1.0, 0.2) * mid * smoothstep(0.9, 0.0, uv.y);
  light += vec3(0.2, 0.3, 1.0) * high * smoothstep(0.1, 1.0, uv.x);
  vec3 c = base * (0.15 + light * (0.6 + 0.6 * m));
  for (int i = 0; i < 8; i++) {
    vec2 bulb = vec2(0.12 + float(i) * 0.108, 0.07);
    float d = dist(uv, bulb);
    vec3 col = hsv(vec3(float(i) / 8.0 * 0.7, 0.8, 1.0));
    c = mix(c, col * (0.2 + bands[i]), smoothstep(0.028, 0.024, d));
    c += col * bands[i] * exp(-d * 25.0) * 0.3;
  }
  outColor = vec4(c, 1.0);
}
