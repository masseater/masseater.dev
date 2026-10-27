// note: 踊る人の顔の位置と傾きを追い、そこへ別の顔を貼り替える。貼った顔は目と口の位置を本人に合わせ、曲の音量で口を開け閉めする。
void main() {
  vec3 c = rgb(uv);
  vec2 nose = joint(0);
  vec2 eyeL = joint(2);
  vec2 eyeR = joint(5);
  vec2 dir = (eyeR - eyeL) * vec2(aspect(), 1.0);
  float size = max(length(dir) * 1.6, 0.06);
  float a = atan(dir.y, dir.x);
  vec2 q = rot((uv - nose) * vec2(aspect(), 1.0), -a) / size;
  float face = length(q * vec2(1.0, 0.8) - vec2(0.0, -0.15));
  vec3 skin = vec3(0.98, 0.82, 0.68);
  float edge = smoothstep(1.0, 0.92, face);
  vec3 f = skin;
  f = mix(f, vec3(0.15, 0.1, 0.08), step(face, 1.0) * step(q.y, -0.65));
  f = mix(f, vec3(0.1), smoothstep(0.13, 0.1, length(q - vec2(-0.33, -0.22))));
  f = mix(f, vec3(0.1), smoothstep(0.13, 0.1, length(q - vec2(0.33, -0.22))));
  f = mix(f, vec3(1.0), smoothstep(0.05, 0.03, length(q - vec2(-0.3, -0.26))));
  f = mix(f, vec3(1.0), smoothstep(0.05, 0.03, length(q - vec2(0.36, -0.26))));
  float open = 0.05 + level * 0.18;
  float mouth = length((q - vec2(0.0, 0.38)) / vec2(0.28, open));
  f = mix(f, vec3(0.6, 0.15, 0.2), smoothstep(1.0, 0.9, mouth));
  f = mix(f, vec3(1.0, 0.6, 0.6), smoothstep(0.12, 0.08, length(q - vec2(-0.55, 0.15))) * 0.6 + smoothstep(0.12, 0.08, length(q - vec2(0.55, 0.15))) * 0.6);
  c = mix(c, f, edge);
  outColor = vec4(c, 1.0);
}
