// note: 奥の部屋と手前の人物、そのさらに手前を横切るぼけた柱を、別々の速さで横へ流す。カメラが人物の周りを回り込んでいるように見える。
void main() {
  float swing = sin(time * 0.6);
  vec2 back = (uv - 0.5) / 1.1 + 0.5 + vec2(swing * 0.04, 0.0);
  vec2 mid = (uv - 0.5) / 1.1 + 0.5 - vec2(swing * 0.03, 0.0);
  vec3 c = plate(back);
  c = mix(c, rgb(mid), matte(mid));
  float pillar = fract(uv.x * 0.6 + swing * 0.5 + 0.2);
  float front = smoothstep(0.1, 0.06, abs(pillar - 0.5));
  c = mix(c, vec3(0.25, 0.2, 0.18), front * 0.85);
  outColor = vec4(c, 1.0);
}
