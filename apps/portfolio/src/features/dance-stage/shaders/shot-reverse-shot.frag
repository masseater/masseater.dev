// note: 2 拍ごとに、正面の画と、手前に大きくぼけた肩をなめて反対側から見た画を切り替える。会話の切り返しの組み立てを踊りに当てはめた。
void main() {
  float reverse = mod(floor(beatCount / 2.0), 2.0);
  vec3 c = rgb(uv);
  if (reverse > 0.5) {
    vec2 p = (vec2(1.0 - uv.x, uv.y) - 0.5) / 1.3 + vec2(0.5, 0.45);
    c = rgb(p) * 0.9;
    float shoulder = smoothstep(0.42, 0.38, length((uv - vec2(0.05, 1.05)) * vec2(1.0, 1.4)));
    c = mix(c, vec3(0.12, 0.1, 0.12), shoulder * 0.92);
  }
  outColor = vec4(c, 1.0);
}
