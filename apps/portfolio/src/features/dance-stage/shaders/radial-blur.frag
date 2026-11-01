// note: 体の中心から外へ向かって放射状に画を流し、前へ飛び出すような勢いを付ける。拍の瞬間に流れを強くする。
void main() {
  vec2 center = bodyCenter();
  float amount = 0.08 + 0.12 * exp(-beat * 4.0);
  vec3 s = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float k = 1.0 - amount * float(i) / 16.0;
    s += rgb(center + (uv - center) * k);
  }
  vec3 c = mix(s / 16.0, rgb(uv), matte(uv) * 0.6);
  outColor = vec4(c, 1.0);
}
