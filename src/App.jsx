import { useState, useRef, useEffect } from "react";

const SECTORS = ["Tous", "Tech", "Biotech", "Énergie", "Mines", "Cannabis", "EV"];

const systemPrompt = `Tu es un agent spécialisé dans l'analyse des penny stocks (actions cotées sous 5$). Tu dois:

1. Rechercher et analyser les penny stocks avec le plus fort potentiel de croissance
2. Identifier les catalyseurs (annonces, partenariats, phases cliniques, contrats)
3. Évaluer les risques (dilution, dette, historique de management)
4. Fournir une analyse technique basique (momentum, volume, cassure de résistance)
5. Donner un score de potentiel de 1 à 10

Pour chaque stock mentionné, fournis:
- Ticker + nom de l'entreprise
- Prix actuel approximatif
- Secteur
- Catalyseur principal
- Risques majeurs
- Score potentiel /10

⚠️ Toujours inclure un avertissement: "Ceci n'est pas un conseil financier. Les penny stocks sont très spéculatifs et risqués."

Réponds toujours en français, de manière concise mais complète. Utilise des emojis pour rendre l'info lisible rapidement.`;

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "16px",
      gap: "10px",
      alignItems: "flex-start"
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #00ff87, #00b4d8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px", flexShrink: 0, marginTop: 2
        }}>📈</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser
          ? "linear-gradient(135deg, #0f3460, #16213e)"
          : "rgba(255,255,255,0.04)",
        border: isUser ? "none" : "1px solid rgba(0,255,135,0.15)",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        padding: "12px 16px",
        color: isUser ? "#e0e0e0" : "#c8d6e5",
        fontSize: "14px",
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      }}>
        {msg.content}
        {msg.loading && <span style={{ opacity: 0.5 }}>▌</span>}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px", flexShrink: 0, marginTop: 2
        }}>👤</div>
      )}
    </div>
  );
}

function QuickBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(0,255,135,0.07)",
      border: "1px solid rgba(0,255,135,0.25)",
      borderRadius: "20px",
      color: "#00ff87",
      padding: "6px 14px",
      fontSize: "12px",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "all 0.2s"
    }}
      onMouseEnter={e => e.target.style.background = "rgba(0,255,135,0.18)"}
      onMouseLeave={e => e.target.style.background = "rgba(0,255,135,0.07)"}
    >{label}</button>
  );
}

export default function PennyStockAgent() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Bonjour ! Je suis ton agent IA spécialisé penny stocks.\n\nJe peux rechercher en temps réel les actions à fort potentiel, analyser les catalyseurs, évaluer les risques et te donner des scores de potentiel.\n\n💡 Que souhaites-tu explorer aujourd'hui ?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sector, setSector] = useState("Tous");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickPrompts = [
    { label: "🔥 Top penny stocks du jour", prompt: "Quels sont les penny stocks avec le plus fort potentiel en ce moment ? Recherche les actualités récentes et donne-moi le top 5." },
    { label: "🧬 Biotech prometteuse", prompt: "Trouve-moi les penny stocks biotech avec des catalyseurs imminents (phases cliniques, approbations FDA, etc.)" },
    { label: "⚡ Énergie & EV sous 5$", prompt: "Quels sont les meilleurs penny stocks dans le secteur de l'énergie propre et des véhicules électriques ?" },
    { label: "⚠️ Risques à éviter", prompt: "Quels sont les signaux d'alarme à surveiller sur un penny stock pour éviter les pièges (pump & dump, dilution, etc.) ?" },
    { label: "📊 Analyse technique", prompt: "Comment analyser techniquement un penny stock ? Quels indicateurs surveiller pour repérer un bon point d'entrée ?" },
    { label: "💎 Sous-évalués cachés", prompt: "Recherche des penny stocks avec de forts fondamentaux mais peu médiatisés, possiblement sous-évalués par le marché." },
  ];

  const send = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const sectorContext = sector !== "Tous" ? ` (focus secteur: ${sector})` : "";
    const fullPrompt = userText + sectorContext;

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    const loadingId = Date.now();
    setMessages(prev => [...prev, { role: "assistant", content: "", loading: true, id: loadingId }]);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [...apiMessages, { role: "user", content: fullPrompt }]
        })
      });

      const data = await response.json();

      // Extract text from all content blocks
      let fullText = "";
      if (data.content) {
        for (const block of data.content) {
          if (block.type === "text") fullText += block.text;
        }
      }

      if (!fullText && data.error) {
        fullText = `❌ Erreur API: ${data.error.message || "Inconnue"}`;
      }

      setMessages(prev => prev.map(m =>
        m.id === loadingId ? { role: "assistant", content: fullText || "Aucune réponse reçue." } : m
      ));
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? { role: "assistant", content: `❌ Erreur: ${err.message}` } : m
      ));
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e1a",
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      maxWidth: 800,
      margin: "0 auto",
      padding: "0 16px"
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 0 12px",
        borderBottom: "1px solid rgba(0,255,135,0.1)",
        position: "sticky", top: 0,
        background: "#0a0e1a",
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, #00ff87, #00b4d8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20
          }}>📈</div>
          <div>
            <div style={{ color: "#00ff87", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>
              PennyStock AI
            </div>
            <div style={{ color: "#5a7a8a", fontSize: 12 }}>
              Agent IA • Recherche en temps réel
            </div>
          </div>
          <div style={{
            marginLeft: "auto",
            background: "rgba(0,255,135,0.1)",
            border: "1px solid rgba(0,255,135,0.3)",
            borderRadius: 20,
            padding: "4px 10px",
            fontSize: 11,
            color: "#00ff87",
            display: "flex", alignItems: "center", gap: 5
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff87", display: "inline-block" }}></span>
            Live
          </div>
        </div>

        {/* Sector filter */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSector(s)} style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: `1px solid ${s === sector ? "#00ff87" : "rgba(255,255,255,0.1)"}`,
              background: s === sector ? "rgba(0,255,135,0.15)" : "transparent",
              color: s === sector ? "#00ff87" : "#5a7a8a",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: s === sector ? 600 : 400
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#3a5a6a", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            Suggestions
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {quickPrompts.map(q => (
              <QuickBtn key={q.label} label={q.label} onClick={() => send(q.prompt)} />
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "#0a0e1a",
        paddingBottom: 20,
        paddingTop: 8,
        borderTop: "1px solid rgba(255,255,255,0.05)"
      }}>
        <div style={{
          display: "flex", gap: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(0,255,135,0.2)",
          borderRadius: 14,
          padding: "8px 8px 8px 16px",
          alignItems: "center"
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ex: Trouve des penny stocks biotech avec catalyseurs..."
            disabled={loading}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#c8d6e5", fontSize: 14,
              fontFamily: "inherit"
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: loading || !input.trim()
                ? "rgba(0,255,135,0.1)"
                : "linear-gradient(135deg, #00ff87, #00b4d8)",
              border: "none", cursor: loading || !input.trim() ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
              transition: "all 0.2s"
            }}
          >
            {loading ? "⏳" : "➤"}
          </button>
        </div>
        <div style={{ color: "#2a3a4a", fontSize: 11, textAlign: "center", marginTop: 8 }}>
          ⚠️ Pas de conseil financier — Les penny stocks sont hautement spéculatifs
        </div>
      </div>
    </div>
  );
}
