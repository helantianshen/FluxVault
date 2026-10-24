import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../features/auth/auth";
import { LoginPage } from "../features/auth/login-page";
import { Layout } from "./layout";
export function App() {
  const { token } = useAuth();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={token ? "workspace" : "login"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
      >
        {token ? <Layout /> : <LoginPage />}
      </motion.div>
    </AnimatePresence>
  );
}
