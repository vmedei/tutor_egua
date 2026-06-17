interface Props {
  feedback: string | null;
  correto: boolean;
  deltaProficiencia: number;
}

export function PainelFeedback({ feedback, correto, deltaProficiencia }: Props) {
  if (!feedback && correto === undefined) return null;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        background: correto ? "#d4edda" : "#f8d7da",
        border: `1px solid ${correto ? "#c3e6cb" : "#f5c6cb"}`,
        marginTop: 16,
      }}
    >
      <strong>{correto ? "Correto!" : "Resposta incorreta"}</strong>
      {deltaProficiencia !== 0 && (
        <span style={{ marginLeft: 8, fontSize: 12, color: "#555" }}>
          ({deltaProficiencia > 0 ? "+" : ""}
          {(deltaProficiencia * 100).toFixed(0)}% proficiência)
        </span>
      )}
      {feedback && <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{feedback}</p>}
    </div>
  );
}
