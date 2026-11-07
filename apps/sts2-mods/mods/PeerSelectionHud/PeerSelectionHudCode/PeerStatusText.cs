using MegaCrit.Sts2.Core.Entities.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Multiplayer.Game;

namespace PeerSelectionHud.PeerSelectionHudCode;

/// <summary>仲間の状態を表示用の文字列にする。ゲームのノードに触らない部分だけをここに置く。</summary>
internal static class PeerStatusText
{
    /// <summary>仲間が今いる画面の名前。</summary>
    internal static string ScreenName(NetScreenType screen) => screen switch
    {
        NetScreenType.None => "—",
        NetScreenType.Room => "部屋 (戦闘・イベントなど)",
        NetScreenType.Map => "マップ",
        NetScreenType.Settings => "設定",
        NetScreenType.Compendium => "図鑑",
        NetScreenType.DeckView => "デッキ確認",
        NetScreenType.CardPile => "山札・捨て札の確認",
        NetScreenType.SimpleCardsView => "カード一覧",
        NetScreenType.CardSelection => "カード選択中",
        NetScreenType.GameOver => "ゲームオーバー",
        NetScreenType.PauseMenu => "ポーズメニュー",
        NetScreenType.Rewards => "報酬画面",
        NetScreenType.Feedback => "フィードバック",
        NetScreenType.SharedRelicPicking => "レリック選択中",
        NetScreenType.RemotePlayerExpandedState => "他プレイヤーの確認",
        _ => screen.ToString(),
    };

    /// <summary>
    /// 仲間がカーソルを合わせている (または選んでいる) もの。無ければ null。
    /// ゲームが同期しているのはカード・レリック・ポーションだけ (HoveredModelData)。
    /// </summary>
    internal static string? HoveredName(AbstractModel? model) => model switch
    {
        CardModel card => $"カード「{card.Title}」",
        RelicModel relic => $"レリック「{relic.Title.GetFormattedText()}」",
        PotionModel potion => $"ポーション「{potion.Title.GetFormattedText()}」",
        _ => null,
    };

    /// <summary>マップで投票している行き先。無ければ null。</summary>
    internal static string? VoteText(MapVote? vote) =>
        vote is { } v ? $"行き先に投票: {v.coord.row + 1} 段目 {v.coord.col + 1} 列目" : null;

    /// <summary>表示する本文 (名前の下の行)。</summary>
    internal static string Describe(NetScreenType? screen, bool isTargeting, AbstractModel? hovered, MapVote? vote)
    {
        List<string> lines = [screen is { } s ? $"画面: {ScreenName(s)}" : "画面: 不明"];

        if (HoveredName(hovered) is { } hoveredName)
        {
            lines.Add(isTargeting ? $"使用先を選択中: {hoveredName}" : $"見ている: {hoveredName}");
        }

        if (VoteText(vote) is { } voteText)
        {
            lines.Add(voteText);
        }

        return string.Join('\n', lines);
    }
}
