// note: 舞台を暗くし、縁のはっきりした強い丸い光で踊る人の胴を追い続ける。光は人の手で動かすように、体の動きにわずかに遅れてついていく。
void main() {
  vec2 target = mix(lastJoint(0), joint(0), 0.35) * 0.5 + bodyCenter() * 0.5;
  target = mix(target, (lastJoint(11) + lastJoint(12) + lastJoint(23) + lastJoint(24)) * 0.25, 0.3);
  float d = dist(uv, target);
  float spot = smoothstep(0.27, 0.25, d);
  vec3 c = rgb(uv) * (0.1 + 1.25 * spot);
  c += vec3(0.08, 0.07, 0.05) * smoothstep(0.35, 0.25, d);
  outColor = vec4(c, 1.0);
}
