import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Button, Container, useMediaQuery, useTheme, Menu, MenuItem, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { OperatorDashboard, LabSampleRegistration, EnergyEfficiency, ReferencesAdmin } from '@/pages';

type Page = 'dashboard' | 'lab' | 'energy' | 'references';

const PAGES: Page[] = ['dashboard', 'lab', 'energy', 'references'];

const pageFromHash = (): Page => {
  const id = window.location.hash.replace('#', '') as Page;
  return PAGES.includes(id) ? id : 'dashboard';
};

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(pageFromHash);

  useEffect(() => {
    const onHashChange = () => setCurrentPage(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));

  const pageConfigs = [
    { id: 'dashboard' as Page, label: 'Дашборд оператора' },
    { id: 'lab' as Page, label: 'Лабораторная проба' },
    { id: 'energy' as Page, label: 'Энергоэффективность' },
    { id: 'references' as Page, label: 'Справочники' },
  ];

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handlePageChange = (page: Page) => {
    window.location.hash = page;
    setCurrentPage(page);
    handleMobileMenuClose();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <OperatorDashboard />;
      case 'lab':
        return <LabSampleRegistration />;
      case 'energy':
        return <EnergyEfficiency />;
      case 'references':
        return <ReferencesAdmin />;
      default:
        return <OperatorDashboard />;
    }
  };

  return (
    <Box sx={{ backgroundColor: '#12100E', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ backgroundColor: '#1C1917', borderBottom: '1px solid #34302C' }}>
        <Container maxWidth={false}>
          <Toolbar sx={{ px: isMd ? 4 : 2, py: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#2FBFA8',
                  letterSpacing: '0.5px',
                }}
              >
                СКК ПП
              </Box>
              {isMd && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {pageConfigs.map((page) => (
                    <Button
                      key={page.id}
                      onClick={() => handlePageChange(page.id)}
                      sx={{
                        color: currentPage === page.id ? '#2FBFA8' : '#A39C94',
                        textTransform: 'none',
                        fontSize: '13px',
                        fontWeight: currentPage === page.id ? 600 : 400,
                        borderBottom: currentPage === page.id ? '2px solid #2FBFA8' : 'none',
                        borderRadius: 0,
                        px: 1.5,
                        py: 1,
                        '&:hover': {
                          color: '#F2EFEA',
                        },
                      }}
                    >
                      {page.label}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>

            {!isMd && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="end"
                onClick={handleMobileMenuOpen}
                sx={{ color: '#2FBFA8' }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Menu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={handleMobileMenuClose}
              PaperProps={{
                sx: {
                  backgroundColor: '#1C1917',
                  borderColor: '#34302C',
                  border: '1px solid #34302C',
                },
              }}
            >
              {pageConfigs.map((page) => (
                <MenuItem
                  key={page.id}
                  onClick={() => handlePageChange(page.id)}
                  selected={currentPage === page.id}
                  sx={{
                    color: currentPage === page.id ? '#2FBFA8' : '#F2EFEA',
                    fontWeight: currentPage === page.id ? 600 : 400,
                    backgroundColor: currentPage === page.id ? '#262220' : 'transparent',
                  }}
                >
                  {page.label}
                </MenuItem>
              ))}
            </Menu>
          </Toolbar>
        </Container>
      </AppBar>

      {renderPage()}
    </Box>
  );
}

export default App;
