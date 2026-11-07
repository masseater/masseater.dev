using Godot;
using MegaCrit.Sts2.Core.Entities.Multiplayer;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Platform;
using MegaCrit.Sts2.Core.Runs;

namespace PeerSelectionHud.PeerSelectionHudCode;

/// <summary>
/// 画面の左に、仲間ごとの「今いる画面・見ているもの・投票先」を出す。
/// </summary>
/// <remarks>
/// 表示に使うのはゲームがもともと同期しているデータだけなので、仲間がこの Mod を入れていなくても動く。
/// 出典 (公開デコンパイル): PeerInputSynchronizer (画面・対象選択中か), HoveredModelTracker (カーソルを合わせているカード等),
/// MapSelectionSynchronizer (マップの投票)。いずれも RunManager.Instance から取れる。
/// Godot のノードは継承せずに組み立てる (Mod のスクリプトを Godot に登録しなくて済むように)。
/// </remarks>
internal sealed class PeerHud
{
    private const int NameFontSize = 17;
    private const int DetailFontSize = 14;

    private static PeerHud? current;

    private readonly RunState runState;
    private readonly RunManager runManager;
    private readonly CanvasLayer layer;
    private readonly Dictionary<ulong, PlayerRow> rows = [];
    private bool detached;

    private PeerHud(Node host, RunState runState)
    {
        this.runState = runState;
        runManager = RunManager.Instance;

        // ゲームの画面 (マップ・カード選択など) より手前に出す。クリックは奥へ素通しする
        layer = new CanvasLayer { Name = MainFile.ModId, Layer = 64 };
        var panel = new PanelContainer
        {
            MouseFilter = Control.MouseFilterEnum.Ignore,
            Position = new Vector2(12, 140),
        };
        panel.AddThemeStyleboxOverride("panel", new StyleBoxFlat
        {
            BgColor = new Color(0, 0, 0, 0.55f),
            CornerRadiusTopLeft = 6,
            CornerRadiusTopRight = 6,
            CornerRadiusBottomLeft = 6,
            CornerRadiusBottomRight = 6,
            ContentMarginLeft = 10,
            ContentMarginRight = 10,
            ContentMarginTop = 6,
            ContentMarginBottom = 6,
        });
        var list = new VBoxContainer { MouseFilter = Control.MouseFilterEnum.Ignore };
        panel.AddChild(list);
        layer.AddChild(panel);

        ulong me = runManager.NetService.NetId;
        foreach (Player player in runState.Players.Where(p => p.NetId != me))
        {
            var row = new PlayerRow(player, PlayerName(player));
            rows[player.NetId] = row;
            list.AddChild(row.Root);
        }

        // ラン中に NMapScreen を作り直すことがあっても二重にならないよう、ノードが消えたら購読もやめる
        layer.TreeExiting += Detach;
        host.CallDeferred(Node.MethodName.AddChild, layer);

        runManager.InputSynchronizer.StateChanged += Refresh;
        runManager.InputSynchronizer.StateRemoved += Refresh;
        runManager.HoveredModelTracker.HoverChanged += Refresh;
        runManager.MapSelectionSynchronizer.PlayerVoteChanged += OnVoteChanged;
        runManager.MapSelectionSynchronizer.PlayerVoteCancelled += OnVoteCancelled;
        runManager.MapSelectionSynchronizer.PlayerVotesCleared += RefreshAll;

        RefreshAll();
    }

    /// <summary>ランの表示を作る。一人プレイでは何も出さない。</summary>
    internal static void Attach(Node host, RunState runState)
    {
        current?.Detach();
        current = runState.Players.Count > 1 ? new PeerHud(host, runState) : null;
    }

    private void Detach()
    {
        if (detached)
        {
            return;
        }

        detached = true;
        runManager.InputSynchronizer.StateChanged -= Refresh;
        runManager.InputSynchronizer.StateRemoved -= Refresh;
        runManager.HoveredModelTracker.HoverChanged -= Refresh;
        runManager.MapSelectionSynchronizer.PlayerVoteChanged -= OnVoteChanged;
        runManager.MapSelectionSynchronizer.PlayerVoteCancelled -= OnVoteCancelled;
        runManager.MapSelectionSynchronizer.PlayerVotesCleared -= RefreshAll;

        if (GodotObject.IsInstanceValid(layer) && !layer.IsQueuedForDeletion())
        {
            layer.QueueFree();
        }

        if (current == this)
        {
            current = null;
        }
    }

    private void OnVoteChanged(Player player, MapVote? oldVote, MapVote? newVote) => Refresh(player.NetId);

    private void OnVoteCancelled(Player player) => Refresh(player.NetId);

    private void RefreshAll()
    {
        foreach (ulong playerId in rows.Keys)
        {
            Refresh(playerId);
        }
    }

    private void Refresh(ulong playerId)
    {
        if (detached || !rows.TryGetValue(playerId, out PlayerRow? row) || runState.GetPlayer(playerId) is not { } player)
        {
            return;
        }

        row.SetDetail(PeerStatusText.Describe(
            ScreenOf(playerId),
            IsTargeting(playerId),
            runManager.HoveredModelTracker.GetHoveredModel(playerId),
            runManager.MapSelectionSynchronizer.GetVote(player)));
    }

    // 相手の入力状態がまだ届いていないと PeerInputSynchronizer は InvalidOperationException を投げる。
    // そのときはログに残し、画面には「不明」と出す (PeerStatusText.Describe が null を「不明」にする)
    private NetScreenType? ScreenOf(ulong playerId)
    {
        try
        {
            return runManager.InputSynchronizer.GetScreenType(playerId);
        }
        catch (InvalidOperationException e)
        {
            MainFile.Log.Debug($"プレイヤー {playerId} の画面を取得できませんでした: {e.Message}");
            return null;
        }
    }

    private bool IsTargeting(ulong playerId)
    {
        try
        {
            return runManager.InputSynchronizer.GetIsTargeting(playerId);
        }
        catch (InvalidOperationException e)
        {
            MainFile.Log.Debug($"プレイヤー {playerId} の対象選択中かを取得できませんでした: {e.Message}");
            return false;
        }
    }

    private string PlayerName(Player player)
    {
        string character = player.Character.Title.GetFormattedText();
        string name = PlatformUtil.GetPlayerName(runManager.NetService.Platform, player.NetId);
        return string.IsNullOrWhiteSpace(name) ? character : $"{name} ({character})";
    }

    /// <summary>仲間 1 人ぶんの表示 (名前と、その下の状態)。</summary>
    private sealed class PlayerRow
    {
        private readonly Label detail;

        internal PlayerRow(Player player, string name)
        {
            Root = new VBoxContainer { MouseFilter = Control.MouseFilterEnum.Ignore };

            var nameLabel = new Label { Text = name, MouseFilter = Control.MouseFilterEnum.Ignore };
            nameLabel.AddThemeFontSizeOverride("font_size", NameFontSize);
            nameLabel.AddThemeColorOverride("font_color", player.Character.NameColor);

            detail = new Label { MouseFilter = Control.MouseFilterEnum.Ignore };
            detail.AddThemeFontSizeOverride("font_size", DetailFontSize);

            Root.AddChild(nameLabel);
            Root.AddChild(detail);
        }

        internal VBoxContainer Root { get; }

        // 相手のマウス移動のたびに呼ばれるので、変わったときだけ書き換える
        internal void SetDetail(string text)
        {
            if (!string.Equals(detail.Text, text, StringComparison.Ordinal))
            {
                detail.Text = text;
            }
        }
    }
}
