// note: 半球の天井を真下から見上げたように、踊りの映像を魚眼の円に丸めて映し、円の外を暗い星空にする。円の縁には寝ころんで見上げる観客の頭の影を並べる。
void main() {
  vec2 d = (uv - 0.5) * vec2(aspect(), 1.0) / 0.48;
  float r = length(d);
  vec3 c = vec3(0.01, 0.01, 0.03) + vec3(1.0) * step(0.997, hash(floor(uv * resolution / 2.0))) * 0.6;
  if (r < 1.0) {
    float theta = r * PI * 0.5;
    vec2 dir = normalize(d + 1e-5) * sin(theta) / max(cos(theta) + 0.6, 0.1);
    vec2 q = 0.5 + dir * vec2(0.42, 0.5);
    float a = time * 0.05;
    q = 0.5 + rot(q - 0.5, a);
    c = rgbOr(q, vec3(0.05)) * (0.6 + 0.4 * cos(theta));
  }
  for (int i = 0; i < 12; i++) {
    float a = float(i) / 12.0 * 2.0 * PI;
    vec2 head = 0.5 + vec2(cos(a) / aspect(), sin(a)) * 0.5;
    c = mix(c, vec3(0.0), step(dist(uv, head), 0.05));
  }
  outColor = vec4(c, 1.0);
}
