import { Box } from '@mui/material';
import { useCallback, useState, useEffect } from 'react';

interface Props {
  width: number;
  minWidth?: number;
  onResize: (width: number) => void;
  children: React.ReactNode;
}

export default function ResizableColumn({ width, minWidth = 100, onResize, children }: Props) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const diff = e.clientX - startX;
    const newWidth = Math.max(minWidth, startWidth + diff);
    onResize(newWidth);
  }, [isResizing, startX, startWidth, minWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 마우스 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Box sx={{
      position: 'relative',
      width,
      minWidth,
      userSelect: isResizing ? 'none' : 'auto',
      marginRight: 2
    }}>
      {children}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: -8,
          width: 16,
          height: '100%',
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover::after, &:active::after': {
            content: '""',
            width: 4,
            height: '60%',
            backgroundColor: 'primary.main',
            borderRadius: '2px',
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
        onMouseDown={handleMouseDown}
      />
    </Box>
  );
}