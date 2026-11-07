#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Indexing
{
    public static class ModelViews
    {
        const int Size = 256;
        const float FieldOfView = 30f;
        const float Pitch = 15f;
        const float NearRatio = 0.01f;
        const float FarRatio = 10f;
        static readonly float[] Yaws = { 180f, 135f, 90f, 0f };
        static readonly Color Background = new Color(0.32f, 0.32f, 0.32f, 1f);
        static readonly Color Ambient = new Color(0.45f, 0.45f, 0.45f, 1f);

        public static byte[][] Render(GameObject model)
        {
            var utility = new PreviewRenderUtility();
            try
            {
                var instance = utility.InstantiatePrefabInScene(model);
                var renderers = instance.GetComponentsInChildren<Renderer>();
                if (renderers.Length == 0)
                {
                    return Array.Empty<byte[]>();
                }

                var bounds = Encapsulate(renderers);
                var radius = bounds.extents.magnitude;
                if (radius <= 0f || float.IsInfinity(radius) || float.IsNaN(radius))
                {
                    return Array.Empty<byte[]>();
                }

                Setup(utility, radius);
                var distance = radius / Mathf.Sin(FieldOfView * 0.5f * Mathf.Deg2Rad);
                return Yaws.Select(yaw => Shoot(utility, bounds.center, distance, yaw)).ToArray();
            }
            finally
            {
                utility.Cleanup();
            }
        }

        static Bounds Encapsulate(IReadOnlyList<Renderer> renderers)
        {
            var bounds = renderers[0].bounds;
            foreach (var renderer in renderers)
            {
                bounds.Encapsulate(renderer.bounds);
            }

            return bounds;
        }

        static void Setup(PreviewRenderUtility utility, float radius)
        {
            var camera = utility.camera;
            camera.fieldOfView = FieldOfView;
            camera.nearClipPlane = radius * NearRatio;
            camera.farClipPlane = radius * FarRatio;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = Background;
            utility.ambientColor = Ambient;
            utility.lights[0].intensity = 1.1f;
            utility.lights[0].transform.rotation = Quaternion.Euler(40f, 150f, 0f);
            utility.lights[1].intensity = 0.6f;
        }

        static byte[] Shoot(PreviewRenderUtility utility, Vector3 center, float distance, float yaw)
        {
            var rotation = Quaternion.Euler(Pitch, yaw, 0f);
            var camera = utility.camera;
            camera.transform.rotation = rotation;
            camera.transform.position = center - rotation * Vector3.forward * distance;
            utility.BeginStaticPreview(new Rect(0, 0, Size, Size));
            utility.Render(true);
            var texture = utility.EndStaticPreview();
            try
            {
                return texture.EncodeToPNG();
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(texture);
            }
        }
    }
}
