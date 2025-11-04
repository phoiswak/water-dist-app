import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AssignedOrders from "./pages/AssignedOrders";

function App() {
  const token = localStorage.getItem("accessToken");

  return (
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
  );
}

export default App;
