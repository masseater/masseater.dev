// note: 白と黒の細い横縞だけで描く。人物の所だけ縞を膨らませて曲げるので、平らな縞の中で体の形が盛り上がって見える。
void main() {
  float m = 0.0;
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) m += matte(uv + vec2(float(i), float(j)) * 0.008);
  m /= 25.0;
  float bulge = m * 0.03 * sin(time * 1.5 + uv.x * 6.0);
  float stripes = step(0.5, fract((uv.y + bulge + m * 0.02) * 60.0 + m * 0.5));
  outColor = vec4(vec3(stripes), 1.0);
}
