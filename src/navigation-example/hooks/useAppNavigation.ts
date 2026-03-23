import { useNavigate } from 'react-router-dom';
import { useNavigationTracker } from '../contexts/NavigationTrackerContext';

export const useAppNavigation = () => {
    const navigate = useNavigate();
    const { canGoBack, triggerExitConfirm } = useNavigationTracker();

    const goBack = () => {
        if (canGoBack()) {
            navigate(-1);
        } else {
            // We are at the root
            triggerExitConfirm();
        }
    };

    const navigateTo = (path: string, options?: any) => {
        navigate(path, options);
    };

    return { goBack, navigateTo, canGoBack };
};
