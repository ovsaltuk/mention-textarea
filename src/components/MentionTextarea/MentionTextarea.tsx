import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ChangeEvent,
  forwardRef,
  useImperativeHandle,
} from "react";
import "./MentionTextarea.css";

export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

interface MentionPosition {
  top: number;
  left: number;
}

interface MentionState {
  active: boolean;
  query: string;
  startIndex: number;
  endIndex: number;
}

interface MentionTextareaProps {
  users: User[];
  placeholder?: string;
  className?: string;
  onMentionSelect?: (user: User) => void;
  value?: string;
  onChange?: (value: string) => void;
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  (
    {
      users,
      placeholder = "Введите текст...",
      className = "",
      onMentionSelect,
      value: externalValue,
      onChange: externalOnChange,
    },
    ref
  ) => {
    const [value, setValue] = useState(externalValue || "");
    const [mentionState, setMentionState] = useState<MentionState | null>(
      null
    );
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionPosition, setMentionPosition] = useState<MentionPosition>({
      top: 0,
      left: 0,
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mirrorDivRef = useRef<HTMLDivElement>(null);


    useImperativeHandle(ref, () => textareaRef.current!);

    useEffect(() => {
      if (externalValue !== undefined) {
        setValue(externalValue);
      }
    }, [externalValue]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      externalOnChange?.(newValue);


      const cursorPos = e.target.selectionStart;
      findMentionAtCursor(newValue, cursorPos);
    };


    const findMentionAtCursor = (text: string, cursorPos: number) => {
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (text[i] === "@") {
          const afterAt = text.substring(i + 1, cursorPos);
          if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
            const query = afterAt.toLowerCase();
            
            setMentionState({
              active: true,
              query,
              startIndex: i,
              endIndex: cursorPos,
            });
            const filtered = users.filter(
              (user) =>
                user.name.toLowerCase().includes(query) ||
                user.username.toLowerCase().includes(query)
            );
            setFilteredUsers(filtered);
            setSelectedIndex(0);
            updateDropdownPosition(i);
            return;
          }
          break;
        }
      }
      closeMentionDropdown();
    };

    const updateDropdownPosition = (atIndex: number) => {
      if (!textareaRef.current || !mirrorDivRef.current) return;

      const textarea = textareaRef.current;
      const mirror = mirrorDivRef.current;

      const styles = window.getComputedStyle(textarea);
      mirror.style.fontFamily = styles.fontFamily;
      mirror.style.fontSize = styles.fontSize;
      mirror.style.lineHeight = styles.lineHeight;
      mirror.style.padding = styles.padding;
      mirror.style.wordWrap = "break-word";
      mirror.style.whiteSpace = "pre-wrap";
      mirror.style.width = styles.width;
      mirror.style.border = "none";
      mirror.style.visibility = "hidden";
      mirror.style.position = "absolute";
      mirror.style.top = "0";
      mirror.style.left = "0";
      mirror.style.zIndex = "-1";

      const textBeforeAt = value.substring(0, atIndex);
      mirror.textContent = textBeforeAt + "@";

      const span = document.createElement("span");
      span.textContent = "@";
      mirror.appendChild(span);

      const spanRect = span.getBoundingClientRect();
      const textareaRect = textarea.getBoundingClientRect();

      setMentionPosition({
        top: spanRect.top - textareaRect.top + spanRect.height + 5,
        left: spanRect.left - textareaRect.left,
      });

      mirror.removeChild(span);
    };

    const closeMentionDropdown = () => {
      setMentionState(null);
      setFilteredUsers([]);
    };

    const insertMention = (user: User) => {
      if (!mentionState || !textareaRef.current) return;

      const textarea = textareaRef.current;
      const start = mentionState.startIndex;
      const end = mentionState.endIndex;

      const mention = `@${user.username} `;
      const newValue =
        value.substring(0, start) + mention + value.substring(end);

      setValue(newValue);
      externalOnChange?.(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = start + mention.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);

      onMentionSelect?.(user);
      closeMentionDropdown();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mentionState) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < filteredUsers.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
        case "Tab":
          if (filteredUsers.length > 0) {
            e.preventDefault();
            insertMention(filteredUsers[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeMentionDropdown();
          break;
      }
    };

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current &&
          !textareaRef.current.contains(e.target as Node)
        ) {
          closeMentionDropdown();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
      const updatePositionOnScroll = () => {
        if (mentionState) {
          updateDropdownPosition(mentionState.startIndex);
        }
      };

      window.addEventListener("scroll", updatePositionOnScroll, true);
      return () => window.removeEventListener("scroll", updatePositionOnScroll, true);
    }, [mentionState]);

    return (
      <div className="mention-textarea-container">
        <div ref={mirrorDivRef} className="mirror-div" />
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            setTimeout(() => {
              if (!dropdownRef.current?.contains(document.activeElement)) {
                closeMentionDropdown();
              }
            }, 200);
          }}
          placeholder={placeholder}
          className={`mention-textarea ${className}`}
        />

        {mentionState && filteredUsers.length > 0 && (
          <div
            ref={dropdownRef}
            className="mention-dropdown"
            style={{
              top: mentionPosition.top,
              left: mentionPosition.left,
            }}
          >
            {filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className={`mention-item ${
                  index === selectedIndex ? "selected" : ""
                }`}
                onClick={() => insertMention(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {user.avatar && (
                  <img src={user.avatar} alt="" className="mention-avatar" />
                )}
                <div className="mention-info">
                  <span className="mention-name">{user.name}</span>
                  <span className="mention-username">@{user.username}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
