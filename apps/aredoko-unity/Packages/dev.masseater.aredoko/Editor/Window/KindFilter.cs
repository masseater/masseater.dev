#nullable enable

using System;
using System.Linq;
using Aredoko.Protocol;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Window
{
    sealed class KindFilter
    {
        const string Everything = "すべての種類";
        static readonly int All = (1 << Labels.Kinds.Length) - 1;

        int mask = All;

        bool IsAll => (mask & All) == All;

        public AssetKind[] Chosen => IsAll ? Array.Empty<AssetKind>() : Labels.Kinds.Where((_, index) => (mask & (1 << index)) != 0).ToArray();

        public string Label
        {
            get
            {
                var chosen = Chosen;
                if (chosen.Length == 0)
                {
                    return Everything;
                }

                return chosen.Length == 1 ? Labels.Kind(chosen[0]) : $"{chosen.Length} 種類";
            }
        }

        public void ShowMenu(Action changed)
        {
            var menu = new GenericMenu();
            menu.AddItem(new GUIContent(Everything), IsAll, () => Set(All, changed));
            menu.AddSeparator(string.Empty);
            for (var index = 0; index < Labels.Kinds.Length; index++)
            {
                var bit = 1 << index;
                var all = IsAll;
                menu.AddItem(new GUIContent(Labels.Kind(Labels.Kinds[index])), !all && (mask & bit) != 0, () => Set(all ? bit : mask ^ bit, changed));
            }

            menu.ShowAsContext();
        }

        void Set(int next, Action changed)
        {
            mask = (next & All) == 0 ? All : next & All;
            changed();
        }
    }
}
