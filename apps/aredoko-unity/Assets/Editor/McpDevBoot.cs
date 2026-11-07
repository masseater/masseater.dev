using UnityEditor;

namespace Aredoko.Development
{
    public static class McpDevBoot
    {
        const string AutoStartOnLoad = "MCPForUnity.AutoStartOnLoad";

        public static void Enable()
        {
            if (EditorPrefs.GetBool(AutoStartOnLoad, false))
            {
                return;
            }

            EditorPrefs.SetBool(AutoStartOnLoad, true);
            EditorUtility.RequestScriptReload();
        }
    }
}
