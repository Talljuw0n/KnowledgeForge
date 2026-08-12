import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { fetchDocuments, generateQuiz, generateFlashcards, extractConcepts, generateStudyPlan, getRecallQuestion, evaluateRecallAnswer } from "../api/backend";
import { supabase } from "../api/auth";

const TABS = ["Quiz", "Flashcards", "Key Concepts", "Study Plan", "Active Recall"];

// ─── Shared helpers ────────────────────────────────────────────────────────

function Spinner({ label = "Generating…" }) {
  return (
    <div style={s.spinnerWrap}>
      <div style={s.spinnerDots}>
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
      <p style={s.spinnerLabel}>{label}</p>
    </div>
  );
}

function DocPicker({ documents, selected, onToggle }) {
  if (!documents.length) return (
    <div style={s.noDocsMsg}>
      No documents yet.{" "}
      <a href="/upload" style={s.uploadLink}>Upload one to get started.</a>
    </div>
  );
  return (
    <div style={s.docPicker}>
      {documents.map(d => (
        <button
          key={d.id}
          onClick={() => onToggle(d.id)}
          style={{ ...s.docChip, ...(selected.includes(d.id) ? s.docChipActive : {}) }}
        >
          {selected.includes(d.id) ? "✓ " : ""}{d.filename}
        </button>
      ))}
    </div>
  );
}

// ─── Quiz Mode ─────────────────────────────────────────────────────────────

function QuizMode({ documents }) {
  const [selected, setSelected] = useState([]);
  const [count, setCount] = useState(10);
  const [type, setType] = useState("mixed");
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const start = async () => {
    if (!selected.length) return setError("Select at least one document.");
    setError(""); setLoading(true);
    try {
      const data = await generateQuiz(selected, count, type);
      setQuiz(data); setCurrent(0); setChosen(null); setSubmitted(false); setScore(0); setDone(false);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const submit = () => {
    if (chosen === null) return;
    setSubmitted(true);
    const q = quiz.questions[current];
    const correct = q.type === "mcq" || q.type === "true_false"
      ? chosen === q.correct
      : true; // short answer always proceeds
    if (correct) setScore(p => p + 1);
  };

  const next = () => {
    if (current + 1 >= quiz.questions.length) { setDone(true); return; }
    setCurrent(p => p + 1); setChosen(null); setSubmitted(false);
  };

  const restart = () => { setQuiz(null); setSelected([]); };

  if (loading) return <Spinner label="Generating quiz…" />;

  if (!quiz) return (
    <div style={s.modeSetup}>
      <h3 style={s.modeTitle}>Quiz Generator</h3>
      <p style={s.modeSub}>Generate a quiz from your documents and test your knowledge.</p>
      <DocPicker documents={documents} selected={selected} onToggle={toggle} />
      <div style={s.controls}>
        <label style={s.label}>Questions
          <select value={count} onChange={e => setCount(+e.target.value)} style={s.select}>
            {[5,10,15,20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label style={s.label}>Type
          <select value={type} onChange={e => setType(e.target.value)} style={s.select}>
            <option value="mixed">Mixed</option>
            <option value="mcq">Multiple Choice</option>
            <option value="true_false">True / False</option>
            <option value="short_answer">Short Answer</option>
          </select>
        </label>
      </div>
      {error && <p style={s.error}>{error}</p>}
      <button onClick={start} style={s.primaryBtn} disabled={!selected.length}>Generate Quiz</button>
    </div>
  );

  if (done) return (
    <div style={s.resultWrap}>
      <div style={s.resultIcon}>{score >= quiz.questions.length * 0.7 ? "🎉" : "📚"}</div>
      <h3 style={s.resultTitle}>{score >= quiz.questions.length * 0.7 ? "Great work!" : "Keep studying!"}</h3>
      <p style={s.resultScore}>{score} / {quiz.questions.length} correct</p>
      <p style={s.resultPct}>{Math.round(score / quiz.questions.length * 100)}%</p>
      <button onClick={restart} style={s.primaryBtn}>New Quiz</button>
      <button onClick={() => { setCurrent(0); setChosen(null); setSubmitted(false); setScore(0); setDone(false); }} style={s.secondaryBtn}>Retry</button>
    </div>
  );

  const q = quiz.questions[current];
  const isCorrect = submitted && q.type !== "short_answer" && chosen === q.correct;
  const isWrong = submitted && q.type !== "short_answer" && chosen !== q.correct;

  return (
    <div style={s.quizWrap}>
      <div style={s.quizHeader}>
        <span style={s.quizProgress}>Question {current + 1} of {quiz.questions.length}</span>
        <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${(current / quiz.questions.length) * 100}%` }} /></div>
      </div>
      <div style={s.questionCard}>
        <span style={s.qTypeBadge}>{q.type === "mcq" ? "Multiple Choice" : q.type === "true_false" ? "True / False" : "Short Answer"}</span>
        <p style={s.questionText}>{q.question}</p>

        {(q.type === "mcq" || q.type === "true_false") && (
          <div style={s.options}>
            {q.options.map((opt, i) => {
              let optStyle = s.optionBtn;
              if (submitted) {
                const letter = q.type === "mcq" ? opt.charAt(0) : opt;
                if (letter === q.correct) optStyle = { ...s.optionBtn, ...s.optionCorrect };
                else if (opt === chosen || letter === chosen) optStyle = { ...s.optionBtn, ...s.optionWrong };
              } else if (opt === chosen) {
                optStyle = { ...s.optionBtn, ...s.optionSelected };
              }
              return (
                <button key={i} onClick={() => !submitted && setChosen(q.type === "mcq" ? opt.charAt(0) : opt)} style={optStyle}>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "short_answer" && (
          <textarea
            placeholder="Type your answer…"
            value={chosen || ""}
            onChange={e => !submitted && setChosen(e.target.value)}
            style={s.shortInput}
            rows={4}
          />
        )}

        {submitted && (
          <div style={{ ...s.explanationBox, ...(isWrong ? s.explanationWrong : s.explanationCorrect) }}>
            {q.type === "short_answer" ? (
              <>
                <p style={s.explanationTitle}>Model Answer</p>
                <p style={s.explanationText}>{q.sample_answer}</p>
                {q.key_points?.length > 0 && (
                  <ul style={s.keyPoints}>{q.key_points.map((kp, i) => <li key={i}>{kp}</li>)}</ul>
                )}
              </>
            ) : (
              <>
                <p style={s.explanationTitle}>{isCorrect ? "✓ Correct!" : "✗ Incorrect"}</p>
                <p style={s.explanationText}>{q.explanation}</p>
              </>
            )}
          </div>
        )}

        <div style={s.quizActions}>
          {!submitted
            ? <button onClick={submit} style={s.primaryBtn} disabled={!chosen}>Check Answer</button>
            : <button onClick={next} style={s.primaryBtn}>{current + 1 < quiz.questions.length ? "Next →" : "See Results"}</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Flashcard Mode ────────────────────────────────────────────────────────

function FlashcardMode({ documents }) {
  const [selected, setSelected] = useState([]);
  const [count, setCount] = useState(15);
  const [cards, setCards] = useState(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [review, setReview] = useState([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const start = async () => {
    if (!selected.length) return setError("Select at least one document.");
    setError(""); setLoading(true);
    try {
      const data = await generateFlashcards(selected, count);
      setCards(data.flashcards); setIdx(0); setFlipped(false); setKnown([]); setReview([]); setDone(false);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const mark = (gotIt) => {
    const card = cards[idx];
    if (gotIt) setKnown(p => [...p, card.id]);
    else setReview(p => [...p, card.id]);
    if (idx + 1 >= cards.length) { setDone(true); return; }
    setIdx(p => p + 1); setFlipped(false);
  };

  const restart = () => { setCards(null); setSelected([]); };
  const retryReview = () => {
    const reviewCards = cards.filter(c => review.includes(c.id));
    setCards(reviewCards); setIdx(0); setFlipped(false); setKnown([]); setReview([]); setDone(false);
  };

  if (loading) return <Spinner label="Generating flashcards…" />;

  if (!cards) return (
    <div style={s.modeSetup}>
      <h3 style={s.modeTitle}>Flashcards</h3>
      <p style={s.modeSub}>Review key terms and concepts in card format.</p>
      <DocPicker documents={documents} selected={selected} onToggle={toggle} />
      <div style={s.controls}>
        <label style={s.label}>Number of cards
          <select value={count} onChange={e => setCount(+e.target.value)} style={s.select}>
            {[10,15,20,30].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      {error && <p style={s.error}>{error}</p>}
      <button onClick={start} style={s.primaryBtn} disabled={!selected.length}>Generate Flashcards</button>
    </div>
  );

  if (done) return (
    <div style={s.resultWrap}>
      <div style={s.resultIcon}>✅</div>
      <h3 style={s.resultTitle}>Session Complete</h3>
      <p style={s.resultScore}>{known.length} known · {review.length} need review</p>
      <div style={s.resultActions}>
        {review.length > 0 && <button onClick={retryReview} style={s.primaryBtn}>Retry {review.length} cards</button>}
        <button onClick={restart} style={s.secondaryBtn}>New Session</button>
      </div>
    </div>
  );

  const card = cards[idx];
  return (
    <div style={s.flashWrap}>
      <div style={s.flashProgress}>Card {idx + 1} of {cards.length} · {known.length} known · {review.length} to review</div>
      <div style={s.flashCard} onClick={() => setFlipped(p => !p)}>
        <div style={s.flashSide}>
          <span style={s.flashLabel}>{flipped ? "Back" : "Front"}</span>
          {card.category && <span style={s.flashCategory}>{card.category}</span>}
          <p style={s.flashText}>{flipped ? card.back : card.front}</p>
          {!flipped && <p style={s.flashHint}>Click to reveal answer</p>}
        </div>
      </div>
      {flipped && (
        <div style={s.flashActions}>
          <button onClick={() => mark(false)} style={s.reviewBtn}>✗ Need Review</button>
          <button onClick={() => mark(true)} style={s.knownBtn}>✓ Got It</button>
        </div>
      )}
      {!flipped && <div style={s.flashActionsPlaceholder} />}
    </div>
  );
}

// ─── Key Concepts ──────────────────────────────────────────────────────────

function ConceptsMode({ documents }) {
  const [selected, setSelected] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedTerm, setExpandedTerm] = useState(null);

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const run = async () => {
    if (!selected.length) return setError("Select at least one document.");
    setError(""); setLoading(true);
    try { setData(await extractConcepts(selected)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (loading) return <Spinner label="Extracting key concepts…" />;

  if (!data) return (
    <div style={s.modeSetup}>
      <h3 style={s.modeTitle}>Key Concepts</h3>
      <p style={s.modeSub}>Extract a summary, key terms, main topics, and likely exam questions from your documents.</p>
      <DocPicker documents={documents} selected={selected} onToggle={toggle} />
      {error && <p style={s.error}>{error}</p>}
      <button onClick={run} style={s.primaryBtn} disabled={!selected.length}>Extract Concepts</button>
    </div>
  );

  return (
    <div style={s.conceptsWrap}>
      <div style={s.conceptsHeader}>
        <h3 style={s.modeTitle}>{data.title}</h3>
        <button onClick={() => setData(null)} style={s.resetBtn}>← New</button>
      </div>

      <section style={s.conceptSection}>
        <h4 style={s.sectionTitle}>Summary</h4>
        <p style={s.summaryText}>{data.summary}</p>
      </section>

      <section style={s.conceptSection}>
        <h4 style={s.sectionTitle}>Main Topics</h4>
        <div style={s.topicList}>
          {(data.main_topics || []).map((t, i) => <span key={i} style={s.topicTag}>{t}</span>)}
        </div>
      </section>

      <section style={s.conceptSection}>
        <h4 style={s.sectionTitle}>Key Terms</h4>
        <div style={s.termGrid}>
          {(data.key_terms || []).map((t, i) => (
            <div key={i} style={s.termCard} onClick={() => setExpandedTerm(expandedTerm === i ? null : i)}>
              <div style={s.termHeader}>
                <span style={s.termName}>{t.term}</span>
                <span style={s.termArrow}>{expandedTerm === i ? "▲" : "▼"}</span>
              </div>
              {expandedTerm === i && <p style={s.termDef}>{t.definition}</p>}
            </div>
          ))}
        </div>
      </section>

      <section style={s.conceptSection}>
        <h4 style={s.sectionTitle}>Likely Exam Questions</h4>
        <ol style={s.examList}>
          {(data.likely_exam_questions || []).map((q, i) => <li key={i} style={s.examQuestion}>{q}</li>)}
        </ol>
      </section>
    </div>
  );
}

// ─── Study Plan ────────────────────────────────────────────────────────────

function StudyPlanMode({ documents }) {
  const [selected, setSelected] = useState([]);
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState(2);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const run = async () => {
    if (!selected.length) return setError("Select at least one document.");
    if (!examDate) return setError("Please set your exam date.");
    setError(""); setLoading(true);
    try { setPlan(await generateStudyPlan(selected, examDate, hours)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (loading) return <Spinner label="Building your study plan…" />;

  if (!plan) return (
    <div style={s.modeSetup}>
      <h3 style={s.modeTitle}>Study Plan Generator</h3>
      <p style={s.modeSub}>Tell us when your exam is and we'll build a personalised day-by-day plan.</p>
      <DocPicker documents={documents} selected={selected} onToggle={toggle} />
      <div style={s.controls}>
        <label style={s.label}>Exam date
          <input type="date" min={today} value={examDate} onChange={e => setExamDate(e.target.value)} style={s.dateInput} />
        </label>
        <label style={s.label}>Hours per day
          <select value={hours} onChange={e => setHours(+e.target.value)} style={s.select}>
            {[1,1.5,2,3,4,5,6].map(h => <option key={h} value={h}>{h}h</option>)}
          </select>
        </label>
      </div>
      {error && <p style={s.error}>{error}</p>}
      <button onClick={run} style={s.primaryBtn} disabled={!selected.length || !examDate}>Generate Plan</button>
    </div>
  );

  return (
    <div style={s.planWrap}>
      <div style={s.conceptsHeader}>
        <h3 style={s.modeTitle}>{plan.title}</h3>
        <button onClick={() => setPlan(null)} style={s.resetBtn}>← New</button>
      </div>
      <p style={s.planMeta}>{plan.total_days} days · {plan.daily_hours}h/day</p>

      <div style={s.planDays}>
        {(plan.plan || []).map((day) => (
          <div key={day.day} style={s.dayCard}>
            <div style={s.dayHeader}>
              <span style={s.dayNum}>Day {day.day}</span>
              <span style={s.dayFocus}>{day.focus}</span>
            </div>
            <ul style={s.taskList}>
              {day.tasks.map((t, i) => <li key={i} style={s.taskItem}>{t}</li>)}
            </ul>
            {day.tip && <p style={s.dayTip}>💡 {day.tip}</p>}
          </div>
        ))}
      </div>

      {plan.general_tips?.length > 0 && (
        <section style={s.conceptSection}>
          <h4 style={s.sectionTitle}>General Tips</h4>
          <ul style={s.examList}>
            {plan.general_tips.map((t, i) => <li key={i} style={s.examQuestion}>{t}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── Active Recall ─────────────────────────────────────────────────────────

function ActiveRecallMode({ documents }) {
  const [selected, setSelected] = useState([]);
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState(null);
  const [prevQuestions, setPrevQuestions] = useState([]);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionScore, setSessionScore] = useState({ total: 0, points: 0 });

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const nextQuestion = async () => {
    setLoading(true); setEvaluation(null); setAnswer("");
    try {
      const q = await getRecallQuestion(selected, prevQuestions);
      setQuestion(q);
      setPrevQuestions(p => [...p, q.topic]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const start = async () => {
    if (!selected.length) return setError("Select at least one document.");
    setError(""); setStarted(true); setSessionScore({ total: 0, points: 0 }); setPrevQuestions([]);
    await nextQuestion();
  };

  const submit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const ev = await evaluateRecallAnswer(question.question, answer, question.model_answer);
      setEvaluation(ev);
      setSessionScore(p => ({ total: p.total + ev.max_score, points: p.points + ev.score }));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const scorePercent = sessionScore.total > 0 ? Math.round(sessionScore.points / sessionScore.total * 100) : 0;

  const toggle2 = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  if (!started) return (
    <div style={s.modeSetup}>
      <h3 style={s.modeTitle}>Active Recall</h3>
      <p style={s.modeSub}>The bot asks you questions about your documents. You answer in your own words. It evaluates your response and gives feedback — the most effective study method.</p>
      <DocPicker documents={documents} selected={selected} onToggle={toggle} />
      {error && <p style={s.error}>{error}</p>}
      <button onClick={start} style={s.primaryBtn} disabled={!selected.length}>Start Session</button>
    </div>
  );

  return (
    <div style={s.recallWrap}>
      <div style={s.recallHeader}>
        <span style={s.recallSessionScore}>Session score: {sessionScore.points}/{sessionScore.total} ({scorePercent}%)</span>
        <button onClick={() => { setStarted(false); setQuestion(null); setPrevQuestions([]); setSessionScore({ total: 0, points: 0 }); }} style={s.resetBtn}>End Session</button>
      </div>

      {loading && !question && <Spinner label="Getting your first question…" />}

      {question && (
        <div style={s.recallCard}>
          <p style={s.recallTopic}>Topic: {question.topic}</p>
          <p style={s.recallQuestion}>{question.question}</p>

          {!evaluation && (
            <>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer in your own words…"
                style={s.recallInput}
                rows={5}
                disabled={loading}
              />
              {question.hints?.length > 0 && (
                <details style={s.hintDetails}>
                  <summary style={s.hintSummary}>Need a hint?</summary>
                  <ul style={s.hintList}>{question.hints.map((h, i) => <li key={i}>{h}</li>)}</ul>
                </details>
              )}
              <button onClick={submit} style={s.primaryBtn} disabled={!answer.trim() || loading}>
                {loading ? "Evaluating…" : "Submit Answer"}
              </button>
            </>
          )}

          {evaluation && (
            <div style={s.evalBox}>
              <div style={s.evalScoreRow}>
                <span style={s.evalScore}>{evaluation.score}/{evaluation.max_score}</span>
                <div style={s.evalBar}>
                  <div style={{ ...s.evalBarFill, width: `${(evaluation.score / evaluation.max_score) * 100}%` }} />
                </div>
              </div>
              <p style={s.evalFeedback}>{evaluation.feedback}</p>
              {evaluation.missed_points?.length > 0 && (
                <div style={s.evalSection}>
                  <p style={s.evalSectionLabel}>Points you missed:</p>
                  <ul style={s.evalList}>{evaluation.missed_points.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
              )}
              {evaluation.correct_points?.length > 0 && (
                <div style={s.evalSection}>
                  <p style={s.evalSectionLabel}>What you got right:</p>
                  <ul style={s.evalList}>{evaluation.correct_points.map((p, i) => <li key={i}>✓ {p}</li>)}</ul>
                </div>
              )}
              <button onClick={nextQuestion} style={s.primaryBtn} disabled={loading}>
                {loading ? "Loading…" : "Next Question →"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p style={s.error}>{error}</p>}
    </div>
  );
}

// ─── Main Study Page ───────────────────────────────────────────────────────

export default function Study() {
  const [tab, setTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetchDocuments().then(setDocuments).catch(() => {});
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.display_name || user.email?.split("@")[0] || "");
    });
  }, []);

  return (
    <div style={s.page}>
      <Header userName={userName} userEmail="" />
      <div style={s.body}>
        <div style={s.topBar}>
          <h1 style={s.pageTitle}>Study Tools</h1>
          <p style={s.pageSub}>AI-powered tools to help you study smarter.</p>
        </div>

        <div style={s.tabs}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{ ...s.tab, ...(tab === i ? s.tabActive : {}) }}>
              {t}
            </button>
          ))}
        </div>

        <div style={s.content}>
          {tab === 0 && <QuizMode documents={documents} />}
          {tab === 1 && <FlashcardMode documents={documents} />}
          {tab === 2 && <ConceptsMode documents={documents} />}
          {tab === 3 && <StudyPlanMode documents={documents} />}
          {tab === 4 && <ActiveRecallMode documents={documents} />}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const s = {
  page: { display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-page, #f5f7f6)" },
  body: { maxWidth: "860px", width: "100%", margin: "0 auto", padding: "32px 24px 60px" },
  topBar: { marginBottom: "28px" },
  pageTitle: { fontSize: "26px", fontWeight: "700", color: "var(--text, #16201c)", letterSpacing: "-0.4px" },
  pageSub: { fontSize: "15px", color: "var(--text-2, #5f6b66)", marginTop: "4px" },

  tabs: { display: "flex", gap: "6px", marginBottom: "28px", flexWrap: "wrap" },
  tab: { padding: "9px 18px", borderRadius: "999px", border: "1px solid var(--border, #e3e7e4)", backgroundColor: "var(--bg, #fff)", fontSize: "14px", fontWeight: "500", color: "var(--text-2, #5f6b66)", cursor: "pointer", transition: "all 0.15s" },
  tabActive: { backgroundColor: "var(--accent, #12876a)", color: "#fff", border: "1px solid var(--accent, #12876a)", fontWeight: "600" },

  content: { backgroundColor: "var(--bg, #fff)", borderRadius: "16px", border: "1px solid var(--border, #e3e7e4)", padding: "32px", minHeight: "400px" },

  modeSetup: { maxWidth: "520px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" },
  modeTitle: { fontSize: "20px", fontWeight: "700", color: "var(--text, #16201c)" },
  modeSub: { fontSize: "14px", color: "var(--text-2, #5f6b66)", lineHeight: "1.6", marginTop: "-12px" },

  noDocsMsg: { fontSize: "14px", color: "var(--text-2, #5f6b66)", padding: "16px 0" },
  uploadLink: { color: "var(--accent, #12876a)", textDecoration: "underline" },

  docPicker: { display: "flex", flexWrap: "wrap", gap: "8px" },
  docChip: { padding: "7px 14px", borderRadius: "999px", border: "1px solid var(--border, #e3e7e4)", backgroundColor: "var(--bg-subtle, #f5f7f6)", fontSize: "13px", color: "var(--text-2, #5f6b66)", cursor: "pointer", transition: "all 0.12s", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  docChipActive: { backgroundColor: "var(--accent, #12876a)", color: "#fff", border: "1px solid var(--accent, #12876a)" },

  controls: { display: "flex", gap: "16px", flexWrap: "wrap" },
  label: { display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text, #16201c)" },
  select: { padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border, #d9dfdb)", fontSize: "14px", color: "var(--text, #16201c)", backgroundColor: "var(--bg, #fff)", cursor: "pointer" },
  dateInput: { padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border, #d9dfdb)", fontSize: "14px", color: "var(--text, #16201c)", backgroundColor: "var(--bg, #fff)" },

  primaryBtn: { padding: "11px 24px", backgroundColor: "var(--accent, #12876a)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", alignSelf: "flex-start", opacity: 1, transition: "opacity 0.15s" },
  secondaryBtn: { padding: "11px 24px", backgroundColor: "var(--bg-subtle, #f5f7f6)", color: "var(--text, #16201c)", border: "1px solid var(--border, #e3e7e4)", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  resetBtn: { fontSize: "13px", color: "var(--text-2, #5f6b66)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" },
  error: { fontSize: "13px", color: "#dc2626" },

  spinnerWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: "16px" },
  spinnerDots: { display: "flex", gap: "6px" },
  spinnerLabel: { fontSize: "14px", color: "var(--text-2, #5f6b66)" },

  resultWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "12px", textAlign: "center" },
  resultIcon: { fontSize: "48px" },
  resultTitle: { fontSize: "22px", fontWeight: "700", color: "var(--text, #16201c)" },
  resultScore: { fontSize: "18px", fontWeight: "600", color: "var(--text, #16201c)" },
  resultPct: { fontSize: "40px", fontWeight: "800", color: "var(--accent, #12876a)" },
  resultActions: { display: "flex", gap: "12px", marginTop: "8px" },

  quizWrap: { display: "flex", flexDirection: "column", gap: "20px" },
  quizHeader: { display: "flex", flexDirection: "column", gap: "8px" },
  quizProgress: { fontSize: "13px", fontWeight: "600", color: "var(--text-2, #5f6b66)" },
  progressBar: { height: "4px", backgroundColor: "var(--bg-subtle, #f0f2f1)", borderRadius: "2px", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "var(--accent, #12876a)", borderRadius: "2px", transition: "width 0.3s" },
  questionCard: { display: "flex", flexDirection: "column", gap: "18px" },
  qTypeBadge: { fontSize: "11px", fontWeight: "700", color: "var(--text-3, #9aa5a0)", textTransform: "uppercase", letterSpacing: "0.6px" },
  questionText: { fontSize: "18px", fontWeight: "600", color: "var(--text, #16201c)", lineHeight: "1.55" },
  options: { display: "flex", flexDirection: "column", gap: "10px" },
  optionBtn: { padding: "13px 18px", borderRadius: "10px", border: "1px solid var(--border, #e3e7e4)", backgroundColor: "var(--bg-subtle, #f9fafb)", fontSize: "14px", color: "var(--text, #16201c)", cursor: "pointer", textAlign: "left", transition: "all 0.12s" },
  optionSelected: { border: "2px solid var(--accent, #12876a)", backgroundColor: "#f0faf7" },
  optionCorrect: { border: "2px solid #16a34a", backgroundColor: "#f0fdf4", color: "#15803d" },
  optionWrong: { border: "2px solid #dc2626", backgroundColor: "#fef2f2", color: "#dc2626" },
  shortInput: { padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--border, #d9dfdb)", fontSize: "14px", color: "var(--text, #16201c)", resize: "vertical", fontFamily: "inherit", outline: "none" },
  explanationBox: { padding: "14px 18px", borderRadius: "10px", border: "1px solid" },
  explanationCorrect: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  explanationWrong: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  explanationTitle: { fontWeight: "700", fontSize: "14px", marginBottom: "4px" },
  explanationText: { fontSize: "14px", lineHeight: "1.6", color: "var(--text, #16201c)" },
  keyPoints: { marginTop: "8px", paddingLeft: "18px", fontSize: "13px", color: "var(--text-2, #5f6b66)" },
  quizActions: { display: "flex", gap: "12px" },

  flashWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" },
  flashProgress: { fontSize: "13px", color: "var(--text-2, #5f6b66)", alignSelf: "flex-start" },
  flashCard: { width: "100%", maxWidth: "560px", minHeight: "220px", backgroundColor: "var(--bg-subtle, #f9fafb)", border: "1px solid var(--border, #e3e7e4)", borderRadius: "16px", padding: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "box-shadow 0.15s" },
  flashSide: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center", width: "100%" },
  flashLabel: { fontSize: "11px", fontWeight: "700", color: "var(--text-3, #9aa5a0)", textTransform: "uppercase", letterSpacing: "0.6px" },
  flashCategory: { fontSize: "12px", backgroundColor: "var(--accent-subtle, #dff2ec)", color: "var(--accent, #12876a)", padding: "3px 10px", borderRadius: "999px", fontWeight: "600" },
  flashText: { fontSize: "18px", fontWeight: "600", color: "var(--text, #16201c)", lineHeight: "1.55" },
  flashHint: { fontSize: "12px", color: "var(--text-3, #9aa5a0)", marginTop: "8px" },
  flashActions: { display: "flex", gap: "16px" },
  flashActionsPlaceholder: { height: "46px" },
  reviewBtn: { padding: "11px 28px", backgroundColor: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
  knownBtn: { padding: "11px 28px", backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" },

  conceptsWrap: { display: "flex", flexDirection: "column", gap: "28px" },
  conceptsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  conceptSection: {},
  sectionTitle: { fontSize: "13px", fontWeight: "700", color: "var(--text-3, #9aa5a0)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "12px" },
  summaryText: { fontSize: "15px", lineHeight: "1.7", color: "var(--text, #16201c)" },
  topicList: { display: "flex", flexWrap: "wrap", gap: "8px" },
  topicTag: { padding: "6px 14px", backgroundColor: "var(--accent-subtle, #dff2ec)", color: "var(--accent, #12876a)", borderRadius: "999px", fontSize: "13px", fontWeight: "600" },
  termGrid: { display: "flex", flexDirection: "column", gap: "8px" },
  termCard: { padding: "12px 16px", border: "1px solid var(--border, #e3e7e4)", borderRadius: "10px", cursor: "pointer", transition: "background-color 0.12s" },
  termHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  termName: { fontSize: "14px", fontWeight: "600", color: "var(--text, #16201c)" },
  termArrow: { fontSize: "11px", color: "var(--text-3, #9aa5a0)" },
  termDef: { fontSize: "14px", color: "var(--text-2, #5f6b66)", lineHeight: "1.6", marginTop: "8px" },
  examList: { paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" },
  examQuestion: { fontSize: "14px", color: "var(--text, #16201c)", lineHeight: "1.6" },

  planWrap: { display: "flex", flexDirection: "column", gap: "24px" },
  planMeta: { fontSize: "14px", color: "var(--text-2, #5f6b66)", marginTop: "-16px" },
  planDays: { display: "flex", flexDirection: "column", gap: "12px" },
  dayCard: { padding: "16px 20px", border: "1px solid var(--border, #e3e7e4)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px" },
  dayHeader: { display: "flex", gap: "12px", alignItems: "baseline" },
  dayNum: { fontSize: "12px", fontWeight: "800", color: "var(--accent, #12876a)", textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 },
  dayFocus: { fontSize: "15px", fontWeight: "600", color: "var(--text, #16201c)" },
  taskList: { paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" },
  taskItem: { fontSize: "13px", color: "var(--text-2, #5f6b66)", lineHeight: "1.55" },
  dayTip: { fontSize: "13px", color: "var(--text-2, #5f6b66)", backgroundColor: "var(--bg-subtle, #f9fafb)", padding: "8px 12px", borderRadius: "8px" },

  recallWrap: { display: "flex", flexDirection: "column", gap: "20px" },
  recallHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  recallSessionScore: { fontSize: "14px", fontWeight: "600", color: "var(--text-2, #5f6b66)" },
  recallCard: { display: "flex", flexDirection: "column", gap: "16px" },
  recallTopic: { fontSize: "12px", fontWeight: "700", color: "var(--accent, #12876a)", textTransform: "uppercase", letterSpacing: "0.5px" },
  recallQuestion: { fontSize: "18px", fontWeight: "600", color: "var(--text, #16201c)", lineHeight: "1.55" },
  recallInput: { padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--border, #d9dfdb)", fontSize: "14px", color: "var(--text, #16201c)", resize: "vertical", fontFamily: "inherit", outline: "none" },
  hintDetails: { fontSize: "13px", color: "var(--text-2, #5f6b66)" },
  hintSummary: { cursor: "pointer", fontWeight: "600" },
  hintList: { paddingLeft: "18px", marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" },
  evalBox: { display: "flex", flexDirection: "column", gap: "14px", padding: "20px", backgroundColor: "var(--bg-subtle, #f9fafb)", borderRadius: "12px", border: "1px solid var(--border, #e3e7e4)" },
  evalScoreRow: { display: "flex", alignItems: "center", gap: "14px" },
  evalScore: { fontSize: "20px", fontWeight: "800", color: "var(--accent, #12876a)", flexShrink: 0 },
  evalBar: { flex: 1, height: "6px", backgroundColor: "var(--border, #e3e7e4)", borderRadius: "3px", overflow: "hidden" },
  evalBarFill: { height: "100%", backgroundColor: "var(--accent, #12876a)", borderRadius: "3px", transition: "width 0.4s" },
  evalFeedback: { fontSize: "14px", lineHeight: "1.65", color: "var(--text, #16201c)" },
  evalSection: { display: "flex", flexDirection: "column", gap: "6px" },
  evalSectionLabel: { fontSize: "12px", fontWeight: "700", color: "var(--text-3, #9aa5a0)", textTransform: "uppercase", letterSpacing: "0.5px" },
  evalList: { paddingLeft: "18px", fontSize: "13px", color: "var(--text-2, #5f6b66)", display: "flex", flexDirection: "column", gap: "4px" },
};
