import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AssignedOrders from "./pages/AssignedOrders";
import { ToastProvider } from "./context/ToastContext";
import { ToastContainer } from "./components/Toast";

function App() {
  const token = localStorage.getItem("accessToken");

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/orders"
            element={token ? <AssignedOrders /> : <Navigate to="/login" />}
          />
          <Route
            path="*"
            element={<Navigate to={token ? "/orders" : "/login"} />}
          />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </ToastProvider>
  );
}

export default App;
