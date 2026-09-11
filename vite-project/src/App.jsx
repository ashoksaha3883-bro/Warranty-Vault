
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import AppRouter from "./router/AppRouter.jsx";
import AppAudio from "./components/ui/AppAudio.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Global background music */}
        <AppAudio />

        {/* All application routes */}
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

