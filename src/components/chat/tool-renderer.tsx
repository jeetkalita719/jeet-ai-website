// src/components/chat/tool-renderer.tsx
import { Contact } from '../contact';
import Fun from '../fun';
import { Presentation } from '../presentation';
import AllProjects from '../projects/AllProjects';
import Resume from '../resume';
import Services from '../services';
import Skills from '../skills';

interface ToolRendererProps {
  toolInvocations: any[];
  messageId: string;
}

const COMPONENTS: Record<string, () => React.ReactNode> = {
  getProjects: () => <AllProjects />,
  getPresentation: () => <Presentation />,
  getResume: () => <Resume />,
  getContact: () => <Contact />,
  getSkills: () => <Skills />,
  getServices: () => <Services />,
  getFun: () => <Fun />,
};

export default function ToolRenderer({ toolInvocations }: ToolRendererProps) {
  return (
    <div className="w-full transition-all duration-300">
      {toolInvocations.map((tool) => {
        const { toolCallId, toolName } = tool;
        const render = COMPONENTS[toolName];
        if (render) {
          return (
            <div key={toolCallId} className="w-full overflow-hidden rounded-lg">
              {render()}
            </div>
          );
        }
        return (
          <div key={toolCallId} className="bg-secondary/10 w-full rounded-lg p-4">
            <p className="text-sm">{typeof tool.result === 'object' ? JSON.stringify(tool.result) : String(tool.result ?? '')}</p>
          </div>
        );
      })}
    </div>
  );
}
