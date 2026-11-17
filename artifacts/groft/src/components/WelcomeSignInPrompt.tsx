import { useAuth } from '@clerk/react';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

export function WelcomeSignInPrompt() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  const navigate = (path: string) => {
    setLocation(path);
  };

  return (
    <Dialog
      open={isLoaded && !isSignedIn}
    >
      <DialogContent
        className="welcome-sign-in"
        data-testid="dialog-welcome-sign-in"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <img
          className="welcome-sign-in-logo"
          src={`${import.meta.env.BASE_URL}brand/groft-logo.svg`}
          alt="GROFT"
        />
        <DialogTitle className="welcome-sign-in-title">Welcome to GROFT</DialogTitle>
        <DialogDescription className="welcome-sign-in-description">
          Sign in to save traditions and return to your collection on any device.
        </DialogDescription>
        <div className="welcome-sign-in-actions">
          <button type="button" className="welcome-sign-in-primary" onClick={() => navigate('/sign-in')} data-testid="button-welcome-sign-in">
            Sign in
          </button>
          <button type="button" onClick={() => navigate('/sign-up')} data-testid="button-welcome-sign-up">
            Create an account
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
