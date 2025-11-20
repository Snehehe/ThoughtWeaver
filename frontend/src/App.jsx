import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import GraphPage from "./pages/GraphPage";
import CapturePage from "./pages/CapturePage";
import InsightsPage from "./pages/InsightsPage";
import { ThoughtWeaverAPI } from "./ThoughtWeaverClient";


export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<GraphPage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
