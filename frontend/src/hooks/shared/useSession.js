import { useEffect, useState } from "react";

import { getSessionStatus } from "../../api/authApi";

export default function useSession() {
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isSessionAuthenticated, setIsSessionAuthenticated] = useState(false);
  const [getSessionErrorMessage, setGetSessionErrorMessage] = useState(null);

  useEffect(() => {
    getSessionStatus()
      .then((sessionStatus) => setIsSessionAuthenticated(sessionStatus.authenticated))
      .catch(() => setGetSessionErrorMessage("Could not connect to the backend."))
      .finally(() => setIsSessionLoading(false));
  }, []);

  return { isSessionLoading, isSessionAuthenticated, getSessionErrorMessage };
}
