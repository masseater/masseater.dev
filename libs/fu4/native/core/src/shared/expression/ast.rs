#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenKind {
    End,
    Ident,
    String,
    Int,
    Float,
    LeftParen,
    RightParen,
    LeftBracket,
    RightBracket,
    Dot,
    Not,
    Less,
    LessEq,
    Greater,
    GreaterEq,
    Eq,
    NotEq,
    And,
    Or,
    Star,
    Comma,
}

impl TokenKind {
    #[must_use]
    pub const fn describe(self) -> &'static str {
        match self {
            TokenKind::End => "END",
            TokenKind::Ident => "IDENT",
            TokenKind::String => "STRING",
            TokenKind::Int => "INTEGER",
            TokenKind::Float => "FLOAT",
            TokenKind::LeftParen => "(",
            TokenKind::RightParen => ")",
            TokenKind::LeftBracket => "[",
            TokenKind::RightBracket => "]",
            TokenKind::Dot => ".",
            TokenKind::Not => "!",
            TokenKind::Less => "<",
            TokenKind::LessEq => "<=",
            TokenKind::Greater => ">",
            TokenKind::GreaterEq => ">=",
            TokenKind::Eq => "==",
            TokenKind::NotEq => "!=",
            TokenKind::And => "&&",
            TokenKind::Or => "||",
            TokenKind::Star => "*",
            TokenKind::Comma => ",",
        }
    }
}

#[derive(Debug, Clone)]
pub struct Token {
    pub kind: TokenKind,
    pub value: String,
    pub line: usize,
    pub column: usize,
}

#[derive(Debug, Clone)]
pub struct ExprError {
    pub message: String,
    pub line: usize,
    pub column: usize,
}

impl ExprError {
    #[must_use]
    pub fn at(token: &Token, message: String) -> Self {
        Self {
            message,
            line: token.line,
            column: token.column,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompareOp {
    Less,
    LessEq,
    Greater,
    GreaterEq,
    Eq,
    NotEq,
}

impl CompareOp {
    #[must_use]
    pub const fn describe(self) -> &'static str {
        match self {
            CompareOp::Less => "<",
            CompareOp::LessEq => "<=",
            CompareOp::Greater => ">",
            CompareOp::GreaterEq => ">=",
            CompareOp::Eq => "==",
            CompareOp::NotEq => "!=",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogicalOp {
    And,
    Or,
}

#[derive(Debug, Clone)]
pub enum Expr {
    Variable {
        name: String,
        token: Token,
    },
    Null {
        token: Token,
    },
    Bool {
        token: Token,
    },
    Int {
        token: Token,
    },
    Float {
        token: Token,
    },
    Str {
        value: String,
        token: Token,
    },
    ObjectDeref {
        receiver: Box<Expr>,
        property: String,
    },
    ArrayDeref {
        receiver: Box<Expr>,
    },
    Index {
        operand: Box<Expr>,
        index: Box<Expr>,
    },
    Not {
        operand: Box<Expr>,
        token: Token,
    },
    Compare {
        op: CompareOp,
        left: Box<Expr>,
        right: Box<Expr>,
    },
    Logical {
        op: LogicalOp,
        left: Box<Expr>,
        right: Box<Expr>,
    },
    Call {
        callee: String,
        args: Vec<Expr>,
        token: Token,
    },
}

impl Expr {
    #[must_use]
    pub fn token(&self) -> &Token {
        match self {
            Expr::Variable { token, .. }
            | Expr::Null { token }
            | Expr::Bool { token, .. }
            | Expr::Int { token, .. }
            | Expr::Float { token, .. }
            | Expr::Str { token, .. }
            | Expr::Not { token, .. }
            | Expr::Call { token, .. } => token,
            Expr::ObjectDeref { receiver, .. } | Expr::ArrayDeref { receiver } => receiver.token(),
            Expr::Index { operand, .. } => operand.token(),
            Expr::Compare { left, .. } | Expr::Logical { left, .. } => left.token(),
        }
    }
}
