import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type ToastActionElement = React.ReactNode;

export type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: "default" | "success" | "error" | "warning";
};

type ToasterToast = ToastProps & {
  open: boolean;
  createdAt: number;
};

type ToastContextProps = {
  toasts: ToasterToast[];
  addToast: (toast: ToastProps) => void;
  updateToast: (id: string, toast: Partial<ToastProps>) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextProps>({
  toasts: [],
  addToast: () => {},
  updateToast: () => {},
  dismissToast: () => {},
});

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  const addToast = React.useCallback((toast: ToastProps) => {
    setToasts((prevToasts) => {
      const newToast: ToasterToast = {
        ...toast,
        id: toast.id || crypto.randomUUID(),
        open: true,
        createdAt: Date.now(),
      };

      const updatedToasts = [
        newToast,
        ...prevToasts.filter((t) => t.id !== toast.id),
      ].slice(0, TOAST_LIMIT);

      return updatedToasts;
    });
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, open: false } : toast
      )
    );

    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    }, TOAST_REMOVE_DELAY);
  }, []);

  const updateToast = React.useCallback(
    (id: string, toast: Partial<ToastProps>) => {
      setToasts((prevToasts) =>
        prevToasts.map((t) => (t.id === id ? { ...t, ...toast } : t))
      );
    },
    []
  );

  const value = React.useMemo(
    () => ({
      toasts,
      addToast,
      updateToast,
      dismissToast,
    }),
    [toasts, addToast, updateToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

// Helper hook for using toast
export function useToastFunctions() {
  const { addToast } = useToast();
  
  const showToast = React.useCallback(
    (props: Omit<ToastProps, "id">) => {
      addToast({ id: crypto.randomUUID(), ...props });
    },
    [addToast]
  );
  
  const showSuccessToast = React.useCallback(
    (props: Omit<ToastProps, "id" | "variant">) => {
      addToast({ id: crypto.randomUUID(), variant: "success", ...props });
    },
    [addToast]
  );
  
  const showErrorToast = React.useCallback(
    (props: Omit<ToastProps, "id" | "variant">) => {
      addToast({ id: crypto.randomUUID(), variant: "error", ...props });
    },
    [addToast]
  );
  
  const showWarningToast = React.useCallback(
    (props: Omit<ToastProps, "id" | "variant">) => {
      addToast({ id: crypto.randomUUID(), variant: "warning", ...props });
    },
    [addToast]
  );
  
  return {
    toast: showToast,
    success: showSuccessToast,
    error: showErrorToast,
    warning: showWarningToast,
  };
} 