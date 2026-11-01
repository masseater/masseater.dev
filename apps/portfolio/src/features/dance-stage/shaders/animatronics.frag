// note: 骨格の上に、金属の腕と油圧の筒とボルトでできた機械の体を重ねる。人の動きをそのまま機械が真似て動くように見える。
void main() {
  vec3 c = mix(plate(uv), rgb(uv), matte(uv)) * 0.45;
  int bones[24] = int[24](11, 13, 13, 15, 12, 14, 14, 16, 11, 12, 23, 24, 11, 23, 12, 24, 23, 25, 25, 27, 24, 26, 26, 28);
  for (int i = 0; i < 12; i++) {
    vec2 a = joint(bones[i * 2]);
    vec2 b = joint(bones[i * 2 + 1]);
    float d = segment(uv, a, b);
    float shine = 0.6 + 0.4 * sin(d * 300.0);
    vec3 metal = vec3(0.55, 0.58, 0.62) * shine;
    c = mix(c, metal, smoothstep(0.016, 0.012, d));
    c = mix(c, vec3(0.2, 0.22, 0.25), smoothstep(0.004, 0.002, abs(d - 0.006)) * step(d, 0.012));
  }
  int ids[12] = int[12](11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28);
  for (int i = 0; i < 12; i++) {
    float d = dist(uv, joint(ids[i]));
    c = mix(c, vec3(0.75, 0.6, 0.25), smoothstep(0.022, 0.018, d));
    c = mix(c, vec3(0.25), smoothstep(0.007, 0.004, d));
  }
  vec2 eye = joint(0);
  c = mix(c, vec3(1.0, 0.15, 0.1), smoothstep(0.012, 0.004, dist(uv, eye + vec2(-0.012, -0.01))) + smoothstep(0.012, 0.004, dist(uv, eye + vec2(0.012, -0.01))));
  outColor = vec4(c, 1.0);
}
