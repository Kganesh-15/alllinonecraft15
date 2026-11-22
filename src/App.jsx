// import { AiDashboard } from "./components/AiDashboard.jsx";

// export default function App() {
//   return (
//     <main>
//       <AiDashboard />
//     </main>
//   );
// }





import { lazy, Suspense, useState } from "react";
import WelcomePage from "./components/WelcomePage.jsx";

const AiDashboard = lazy(() =>
  import("./components/AiDashboard.jsx").then((module) => ({
    default: module.AiDashboard,
  }))
);

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [initialTool, setInitialTool] = useState(null);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [initialVoiceReplies, setInitialVoiceReplies] = useState(false);

  if (!showDashboard) {
    return (
      <WelcomePage
        onExplore={(toolName, promptText = "", voiceReplies = false) => {
          setInitialTool(toolName || null);
          setInitialPrompt(promptText.trim());
          setInitialVoiceReplies(voiceReplies);
          setShowDashboard(true);
        }}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
          <div role="status" className="flex items-center gap-3 text-sm font-semibold">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />
            Opening your creative workspace…
          </div>
        </main>
      }
    >
      <main>
        <AiDashboard
          initialTool={initialTool}
          initialPrompt={initialPrompt}
          initialVoiceReplies={initialVoiceReplies}
        />
      </main>
    </Suspense>
  );
}